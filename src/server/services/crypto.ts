import { config } from "../config";

const IV_LENGTH = 12;

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
