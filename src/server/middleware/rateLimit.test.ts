import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { rateLimit } from "./rateLimit";

function createApp(options: Parameters<typeof rateLimit>[0]): Hono {
	const app = new Hono();
	app.use("/*", rateLimit(options));
	app.get("/test", (c) => c.json({ ok: true }));
	return app;
}

function req(app: Hono, ip = "1.2.3.4"): Promise<Response> {
	return app.request("/test", {
		headers: { "x-forwarded-for": ip },
	});
}

describe("rateLimit", () => {
	it("allows requests up to the limit", async () => {
		const app = createApp({ windowMs: 60_000, max: 3 });

		for (let i = 0; i < 3; i++) {
			const res = await req(app);
			expect(res.status).toBe(200);
		}
	});

	it("returns 429 after limit exceeded", async () => {
		const app = createApp({ windowMs: 60_000, max: 2 });

		await req(app);
		await req(app);
		const res = await req(app);
		expect(res.status).toBe(429);

		const body = await res.json();
		expect(body.error).toBe("Too many requests");
	});

	it("includes Retry-After header on 429", async () => {
		const app = createApp({ windowMs: 60_000, max: 1 });

		await req(app);
		const res = await req(app);
		expect(res.status).toBe(429);

		const retryAfter = res.headers.get("Retry-After");
		expect(retryAfter).toBeTruthy();
		expect(Number(retryAfter)).toBeGreaterThan(0);
	});

	it("resets after window expires", async () => {
		const app = createApp({ windowMs: 100, max: 1 });

		const res1 = await req(app);
		expect(res1.status).toBe(200);

		const res2 = await req(app);
		expect(res2.status).toBe(429);

		await Bun.sleep(150);

		const res3 = await req(app);
		expect(res3.status).toBe(200);
	});

	it("custom keyFn isolates rate limits per key", async () => {
		const app = createApp({
			windowMs: 60_000,
			max: 1,
			keyFn: (c) => c.req.header("x-api-key") || "anonymous",
		});

		// User A uses their limit
		const res1 = await app.request("/test", {
			headers: { "x-api-key": "user-a" },
		});
		expect(res1.status).toBe(200);

		// User A is now rate limited
		const res2 = await app.request("/test", {
			headers: { "x-api-key": "user-a" },
		});
		expect(res2.status).toBe(429);

		// User B still has their own limit
		const res3 = await app.request("/test", {
			headers: { "x-api-key": "user-b" },
		});
		expect(res3.status).toBe(200);
	});

	it("different IPs have independent counters", async () => {
		const app = createApp({ windowMs: 60_000, max: 1 });

		const res1 = await req(app, "10.0.0.1");
		expect(res1.status).toBe(200);

		const res2 = await req(app, "10.0.0.1");
		expect(res2.status).toBe(429);

		const res3 = await req(app, "10.0.0.2");
		expect(res3.status).toBe(200);
	});
});
