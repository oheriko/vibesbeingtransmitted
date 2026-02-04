import type { Context, Next } from "hono";
import { config } from "../config";

const SLACK_SIGNATURE_VERSION = "v0";
const TIMESTAMP_TOLERANCE_SECONDS = 60 * 5; // 5 minutes

export async function verifySlackRequest(c: Context, next: Next): Promise<Response | undefined> {
	const signature = c.req.header("x-slack-signature");
	const timestamp = c.req.header("x-slack-request-timestamp");

	if (!signature || !timestamp) {
		return c.json({ error: "Missing Slack signature headers" }, 401);
	}

	// Check timestamp to prevent replay attacks
	const now = Math.floor(Date.now() / 1000);
	const requestTimestamp = Number.parseInt(timestamp, 10);
	if (Math.abs(now - requestTimestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
		return c.json({ error: "Request timestamp too old" }, 401);
	}

	// Get raw body for signature verification
	const rawBody = await c.req.text();

	// Store raw body for later use
	c.set("rawBody", rawBody);

	// Compute expected signature
	const sigBasestring = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(config.slack.signingSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	const signatureBuffer = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(sigBasestring)
	);
	const expectedSignature = `${SLACK_SIGNATURE_VERSION}=${Buffer.from(signatureBuffer).toString("hex")}`;

	// Constant-time comparison
	if (!timingSafeEqual(signature, expectedSignature)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	await next();
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}
