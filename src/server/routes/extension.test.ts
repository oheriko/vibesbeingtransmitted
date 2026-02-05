import { beforeEach, describe, expect, it, mock } from "bun:test";

// Provide env vars so config loads successfully
process.env.APP_URL = "http://localhost:3000";
process.env.ENCRYPTION_KEY = "aa".repeat(32);
process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-minimum-32chars!!";
process.env.SLACK_CLIENT_ID = "test";
process.env.SLACK_CLIENT_SECRET = "test";
process.env.SLACK_SIGNING_SECRET = "test";
process.env.SPOTIFY_CLIENT_ID = "test";
process.env.SPOTIFY_CLIENT_SECRET = "test";

const mockFindFirst = mock(() => Promise.resolve(null));
const mockSetUserStatus = mock(() => Promise.resolve());
const mockUpdate = mock(() => ({
	set: mock(() => ({
		where: mock(() => Promise.resolve()),
	})),
}));

// Mock database
mock.module("@db/index", () => ({
	db: {
		query: {
			users: {
				findFirst: mockFindFirst,
			},
		},
		update: mockUpdate,
	},
	schema: {
		users: {
			extensionToken: "extension_token",
			id: "id",
		},
	},
}));

// Mock drizzle-orm eq function
mock.module("drizzle-orm", () => ({
	eq: (a: string, b: string) => ({ field: a, value: b }),
}));

// Mock Slack service
mock.module("../services/slack", () => ({
	setUserStatus: mockSetUserStatus,
}));

// Use real hashToken (it's pure, no external deps beyond crypto)
const { hashToken } = await import("../services/crypto");
const { Hono } = await import("hono");
const { extension } = await import("./extension");

const VALID_TOKEN = "test-extension-token";

function makeUser() {
	return {
		id: "U1",
		workspaceId: "W1",
		isSharing: true,
		extensionToken: hashToken(VALID_TOKEN),
	};
}

function createApp() {
	const app = new Hono();
	app.route("/extension", extension);
	return app;
}

function postNowPlaying(
	app: ReturnType<typeof createApp>,
	body: unknown,
	token?: string
): Promise<Response> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (token) headers["X-Extension-Token"] = token;

	return app.request("/extension/now-playing", {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
}

const validPayload = {
	track: {
		source: "youtube-music",
		title: "Test Song",
		artist: "Test Artist",
		album: "Test Album",
	},
	isPlaying: true,
	timestamp: Date.now(),
};

describe("POST /extension/now-playing", () => {
	beforeEach(() => {
		mockFindFirst.mockReset();
		mockSetUserStatus.mockReset();
		mockUpdate.mockReset();

		// Default: valid user found
		mockFindFirst.mockImplementation(() => Promise.resolve(makeUser()));
		mockSetUserStatus.mockImplementation(() => Promise.resolve());
		mockUpdate.mockImplementation(() => ({
			set: () => ({
				where: () => Promise.resolve(),
			}),
		}));
	});

	it("returns 401 for missing token", async () => {
		const app = createApp();
		const res = await app.request("/extension/now-playing", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validPayload),
		});
		expect(res.status).toBe(401);
	});

	it("returns 401 for invalid token", async () => {
		mockFindFirst.mockImplementation(() => Promise.resolve(null));
		const app = createApp();
		const res = await postNowPlaying(app, validPayload, "bad-token");
		expect(res.status).toBe(401);
	});

	it("returns 400 for invalid JSON body", async () => {
		const app = createApp();
		const res = await app.request("/extension/now-playing", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Extension-Token": VALID_TOKEN,
			},
			body: "not json {{{",
		});
		expect(res.status).toBe(400);
	});

	it("returns 400 if isPlaying is not boolean", async () => {
		const app = createApp();
		const res = await postNowPlaying(app, { ...validPayload, isPlaying: "yes" }, VALID_TOKEN);
		expect(res.status).toBe(400);
	});

	it("returns 400 if timestamp is not number", async () => {
		const app = createApp();
		const res = await postNowPlaying(app, { ...validPayload, timestamp: "now" }, VALID_TOKEN);
		expect(res.status).toBe(400);
	});

	it("returns 400 if track.title is not a string", async () => {
		const app = createApp();
		const payload = {
			...validPayload,
			track: { ...validPayload.track, title: 123 },
		};
		const res = await postNowPlaying(app, payload, VALID_TOKEN);
		expect(res.status).toBe(400);
	});

	it("returns 400 if track.title exceeds 500 chars", async () => {
		const app = createApp();
		const payload = {
			...validPayload,
			track: { ...validPayload.track, title: "x".repeat(501) },
		};
		const res = await postNowPlaying(app, payload, VALID_TOKEN);
		expect(res.status).toBe(400);
	});

	it("returns 400 if track.artist exceeds 500 chars", async () => {
		const app = createApp();
		const payload = {
			...validPayload,
			track: { ...validPayload.track, artist: "x".repeat(501) },
		};
		const res = await postNowPlaying(app, payload, VALID_TOKEN);
		expect(res.status).toBe(400);
	});

	it("returns 400 if track.url exceeds 2000 chars", async () => {
		const app = createApp();
		const payload = {
			...validPayload,
			track: {
				...validPayload.track,
				url: `https://example.com/${"x".repeat(2000)}`,
			},
		};
		const res = await postNowPlaying(app, payload, VALID_TOKEN);
		expect(res.status).toBe(400);
	});

	it("returns 200 for valid payload with track", async () => {
		const app = createApp();
		const res = await postNowPlaying(app, validPayload, VALID_TOKEN);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	it("returns 200 for valid payload with track=null (stopped playing)", async () => {
		const app = createApp();
		const res = await postNowPlaying(
			app,
			{ track: null, isPlaying: false, timestamp: Date.now() },
			VALID_TOKEN
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});
});
