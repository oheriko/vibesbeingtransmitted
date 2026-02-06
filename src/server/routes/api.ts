import { db, schema } from "@db/index";
import type { DashboardStatus } from "@shared/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { config } from "../config";
import { getDomainUser, requireSession } from "../middleware/session";
import { createSignedState } from "../services/crypto";

const api = new Hono();

// All /api/user/* and /api/spotify/* routes require a better-auth session
api.use("/user/*", requireSession);
api.use("/spotify/*", requireSession);

// Get user status
api.get("/user/status", async (c) => {
	const user = getDomainUser(c);

	const status: DashboardStatus = {
		isConnected: !!user.spotifyAccessToken,
		isSharing: user.isSharing,
		currentTrack: user.lastTrackName
			? {
					name: user.lastTrackName,
					artist: user.lastArtistName || "Unknown Artist",
					isPlaying: user.isCurrentlyPlaying ?? false,
				}
			: null,
		lastSource: user.lastSource ?? null,
		lastUpdated: user.lastPolledAt?.toISOString() ?? null,
		hasExtensionToken: !!user.extensionToken,
	};

	return c.json(status);
});

// Toggle sharing
api.post("/user/sharing", async (c) => {
	const user = getDomainUser(c);
	const body = await c.req.json<{ isSharing: boolean }>();

	await db
		.update(schema.users)
		.set({ isSharing: body.isSharing })
		.where(eq(schema.users.id, user.id));

	return c.json({ ok: true });
});

// Disconnect Spotify
api.post("/user/disconnect", async (c) => {
	const user = getDomainUser(c);

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
		.where(eq(schema.users.id, user.id));

	return c.json({ ok: true });
});

// Get Spotify connect URL (returns a signed URL, no bare user_id)
api.get("/spotify/connect-url", async (c) => {
	const user = getDomainUser(c);
	const signedState = await createSignedState(user.id);
	const url = `${config.appUrl}/auth/spotify/start?state=${encodeURIComponent(signedState)}`;

	return c.json({ url });
});

export { api };
