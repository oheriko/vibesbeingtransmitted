import type { Context, MiddlewareHandler, Next } from "hono";

interface RateLimitOptions {
	windowMs: number;
	max: number;
	keyFn?: (c: Context) => string;
}

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup of expired entries
setInterval(() => {
	const now = Date.now();
	for (const store of stores.values()) {
		for (const [key, entry] of store) {
			if (entry.resetAt <= now) {
				store.delete(key);
			}
		}
	}
}, CLEANUP_INTERVAL_MS);

function getClientIp(c: Context): string {
	return (
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown"
	);
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
	const { windowMs, max, keyFn } = options;
	const storeId = `${windowMs}:${max}:${Math.random()}`;
	const store = new Map<string, RateLimitEntry>();
	stores.set(storeId, store);

	return async (c: Context, next: Next) => {
		const key = keyFn ? keyFn(c) : getClientIp(c);
		const now = Date.now();

		let entry = store.get(key);
		if (!entry || entry.resetAt <= now) {
			entry = { count: 0, resetAt: now + windowMs };
			store.set(key, entry);
		}

		entry.count++;

		if (entry.count > max) {
			const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
			c.header("Retry-After", String(retryAfter));
			return c.json({ error: "Too many requests" }, 429);
		}

		await next();
	};
}
