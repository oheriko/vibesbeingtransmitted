import { config } from "../config";

const IV_LENGTH = 12;
const DEFAULT_STATE_TTL_SECONDS = 600; // 10 minutes

function getKey(): ArrayBuffer {
	const keyHex = config.encryptionKey;
	if (keyHex.length !== 64) {
		throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
	}
	const key = new Uint8Array(32);
	for (let i = 0; i < 32; i++) {
		key[i] = Number.parseInt(keyHex.slice(i * 2, i * 2 + 2), 16);
	}
	return key.buffer as ArrayBuffer;
}

async function hmacSign(data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		getKey(),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
	return Buffer.from(sig).toString("base64url");
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
	const expected = await hmacSign(data);
	if (expected.length !== signature.length) return false;
	const a = new TextEncoder().encode(expected);
	const b = new TextEncoder().encode(signature);
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a[i] ^ b[i];
	}
	return result === 0;
}

/** Create an HMAC-signed state token with payload and TTL */
export async function createSignedState(
	payload: string,
	ttlSeconds: number = DEFAULT_STATE_TTL_SECONDS
): Promise<string> {
	const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
	const data = Buffer.from(`${payload}:${expiry}`).toString("base64url");
	const sig = await hmacSign(data);
	return `${data}.${sig}`;
}

/** Verify an HMAC-signed state token, returns payload or null */
export async function verifySignedState(token: string): Promise<string | null> {
	const dotIndex = token.indexOf(".");
	if (dotIndex === -1) return null;

	const data = token.slice(0, dotIndex);
	const sig = token.slice(dotIndex + 1);

	if (!(await hmacVerify(data, sig))) return null;

	const decoded = Buffer.from(data, "base64url").toString();
	const lastColon = decoded.lastIndexOf(":");
	if (lastColon === -1) return null;

	const payload = decoded.slice(0, lastColon);
	const expiry = Number.parseInt(decoded.slice(lastColon + 1), 10);

	if (Number.isNaN(expiry) || Math.floor(Date.now() / 1000) > expiry) return null;

	return payload;
}

/** SHA-256 hash a token for storage */
export function hashToken(token: string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(token);
	return hasher.digest("hex");
}

export async function encrypt(plaintext: string): Promise<string> {
	const key = await crypto.subtle.importKey("raw", getKey(), { name: "AES-GCM" }, false, [
		"encrypt",
	]);

	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const encodedText = new TextEncoder().encode(plaintext);

	const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodedText);

	// Combine IV + ciphertext (which includes auth tag)
	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(ciphertext), iv.length);

	return Buffer.from(combined).toString("base64");
}

export async function decrypt(encrypted: string): Promise<string> {
	const key = await crypto.subtle.importKey("raw", getKey(), { name: "AES-GCM" }, false, [
		"decrypt",
	]);

	const combined = new Uint8Array(Buffer.from(encrypted, "base64"));
	const iv = combined.slice(0, IV_LENGTH);
	const ciphertext = combined.slice(IV_LENGTH);

	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
		key,
		ciphertext.buffer as ArrayBuffer
	);

	return new TextDecoder().decode(decrypted);
}
