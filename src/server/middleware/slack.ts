import { timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";
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

	// Constant-time comparison (use crypto.timingSafeEqual with dummy on length mismatch)
	const sigBuf = Buffer.from(signature);
	const expectedBuf = Buffer.from(expectedSignature);
	if (sigBuf.length !== expectedBuf.length) {
		// Perform dummy comparison to prevent timing leak on length mismatch
		cryptoTimingSafeEqual(expectedBuf, expectedBuf);
		return c.json({ error: "Invalid signature" }, 401);
	}
	if (!cryptoTimingSafeEqual(sigBuf, expectedBuf)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	await next();
}
