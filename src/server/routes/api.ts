import { db, schema } from "@db/index";
import type { UserStatus } from "@shared/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { config } from "../config";

const api = new Hono();

// Get user status by session
api.get("/user/status", async (c) => {
	const sessionId = c.req.header("X-Session-Id");

	if (!sessionId) {
		return c.json({ error: "No session" }, 401);
	}

	const session = await db.query.sessions.findFirst({
		where: eq(schema.sessions.id, sessionId),
	});

	if (!session || session.expiresAt < new Date()) {
		return c.json({ error: "Invalid session" }, 401);
	}

	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, session.userId),
	});

	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	const status: UserStatus = {
		isConnected: !!user.spotifyAccessToken,
		isSharing: user.isSharing,
		currentTrack: user.lastTrackName
			? {
					name: user.lastTrackName,
					artist: user.lastArtistName || "Unknown Artist",
					isPlaying: user.isCurrentlyPlaying ?? false,
				}
			: null,
	};

	return c.json(status);
});

// Toggle sharing
api.post("/user/sharing", async (c) => {
	const sessionId = c.req.header("X-Session-Id");

	if (!sessionId) {
		return c.json({ error: "No session" }, 401);
	}

	const session = await db.query.sessions.findFirst({
		where: eq(schema.sessions.id, sessionId),
	});

	if (!session || session.expiresAt < new Date()) {
		return c.json({ error: "Invalid session" }, 401);
	}

	const body = await c.req.json<{ isSharing: boolean }>();

	await db
		.update(schema.users)
		.set({ isSharing: body.isSharing })
		.where(eq(schema.users.id, session.userId));

	return c.json({ ok: true });
});

// Disconnect Spotify
api.post("/user/disconnect", async (c) => {
	const sessionId = c.req.header("X-Session-Id");

	if (!sessionId) {
		return c.json({ error: "No session" }, 401);
	}

	const session = await db.query.sessions.findFirst({
		where: eq(schema.sessions.id, sessionId),
	});

	if (!session || session.expiresAt < new Date()) {
		return c.json({ error: "Invalid session" }, 401);
	}

	await db
		.update(schema.users)
		.set({
			spotifyAccessToken: null,
			spotifyRefreshToken: null,
			spotifyExpiresAt: null,
			isSharing: false,
			lastTrackId: null,
			lastTrackName: null,
			lastArtistName: null,
			isCurrentlyPlaying: false,
		})
		.where(eq(schema.users.id, session.userId));

	return c.json({ ok: true });
});

// Get Spotify connect URL
api.get("/spotify/connect-url", async (c) => {
	const sessionId = c.req.header("X-Session-Id");

	if (!sessionId) {
		return c.json({ error: "No session" }, 401);
	}

	const session = await db.query.sessions.findFirst({
		where: eq(schema.sessions.id, sessionId),
	});

	if (!session || session.expiresAt < new Date()) {
		return c.json({ error: "Invalid session" }, 401);
	}

	const url = `${config.appUrl}/auth/spotify/start?user_id=${session.userId}`;

	return c.json({ url });
});

export { api };
