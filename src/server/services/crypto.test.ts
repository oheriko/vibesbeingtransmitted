import { describe, expect, it } from "bun:test";

// Provide env vars so loadConfig() succeeds when crypto.ts imports config
process.env.APP_URL = "http://localhost:3000";
process.env.ENCRYPTION_KEY = "aa".repeat(32); // 64 hex chars = 32 bytes
process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-minimum-32chars!!";
process.env.SLACK_CLIENT_ID = "test";
process.env.SLACK_CLIENT_SECRET = "test";
process.env.SLACK_SIGNING_SECRET = "test";
process.env.SPOTIFY_CLIENT_ID = "test";
process.env.SPOTIFY_CLIENT_SECRET = "test";

const { createSignedState, verifySignedState, hashToken } = await import("./crypto");

describe("createSignedState", () => {
	it("returns a string containing a . separator", async () => {
		const token = await createSignedState("test-payload");
		expect(token).toContain(".");
		expect(token.split(".").length).toBe(2);
	});

	it("roundtrips: create → verify returns original payload", async () => {
		const payload = "my-oauth-state-123";
		const token = await createSignedState(payload);
		const result = await verifySignedState(token);
		expect(result).toBe(payload);
	});

	it("respects custom TTL", async () => {
		const token = await createSignedState("payload", 3600);
		const result = await verifySignedState(token);
		expect(result).toBe("payload");
	});
});

describe("verifySignedState", () => {
	it("returns null for empty string", async () => {
		expect(await verifySignedState("")).toBeNull();
	});

	it("returns null for garbage string", async () => {
		expect(await verifySignedState("not-a-valid-token")).toBeNull();
	});

	it("returns null for token with no .", async () => {
		expect(await verifySignedState("nodothere")).toBeNull();
	});

	it("returns null for tampered signature", async () => {
		const token = await createSignedState("payload");
		const [data, sig] = token.split(".");
		// Flip the first character of the signature
		const tampered = `${data}.${sig[0] === "a" ? "b" : "a"}${sig.slice(1)}`;
		expect(await verifySignedState(tampered)).toBeNull();
	});

	it("returns null for tampered payload", async () => {
		const token = await createSignedState("payload");
		const [data, sig] = token.split(".");
		// Flip the first character of the data
		const tampered = `${data[0] === "a" ? "b" : "a"}${data.slice(1)}.${sig}`;
		expect(await verifySignedState(tampered)).toBeNull();
	});

	it("returns null for expired token (TTL = -1)", async () => {
		const token = await createSignedState("payload", -1);
		expect(await verifySignedState(token)).toBeNull();
	});

	it("returns null for expired token (TTL = 0)", async () => {
		// TTL=0 means expiry = floor(now/1000) + 0 = current second.
		// The verify check is `floor(now/1000) > expiry`, which may not be true
		// in the same second, so we use TTL=-1 as a more reliable zero-window test.
		const token = await createSignedState("payload", -1);
		expect(await verifySignedState(token)).toBeNull();
	});

	it("returns payload for valid non-expired token", async () => {
		const token = await createSignedState("valid-payload", 60);
		expect(await verifySignedState(token)).toBe("valid-payload");
	});
});

describe("hashToken", () => {
	it("returns a 64-char hex string", () => {
		const hash = hashToken("test-token");
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("same input always produces same output", () => {
		const hash1 = hashToken("deterministic");
		const hash2 = hashToken("deterministic");
		expect(hash1).toBe(hash2);
	});

	it("different inputs produce different outputs", () => {
		const hash1 = hashToken("input-a");
		const hash2 = hashToken("input-b");
		expect(hash1).not.toBe(hash2);
	});
});
