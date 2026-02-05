import { db, schema } from "@db/index";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { setUserStatus } from "../services/slack";

const extension = new Hono();

interface NowPlayingPayload {
	track: {
		source: string;
		title: string;
		artist: string;
		album?: string;
		thumbnailUrl?: string;
		url?: string;
	} | null;
	isPlaying: boolean;
	timestamp: number;
}

// Middleware to validate extension token
async function getUser(token: string | undefined) {
	if (!token) return null;

	const user = await db.query.users.findFirst({
		where: eq(schema.users.extensionToken, token),
	});

	return user;
}

// Receive now-playing updates from browser extension
extension.post("/now-playing", async (c) => {
	const token = c.req.header("X-Extension-Token");
	const user = await getUser(token);

	if (!user) {
		return c.json({ error: "Invalid token" }, 401);
	}

	if (!user.isSharing) {
		return c.json({ ok: true, message: "Sharing disabled" });
	}

	const body = await c.req.json<NowPlayingPayload>();
	const { track, isPlaying } = body;

	// Build a track object compatible with our Slack service
	const spotifyLikeTrack = track
		? {
				id: `${track.source}:${track.title}:${track.artist}`,
				name: track.title,
				artists: [{ name: track.artist }],
				album: { name: track.album || "", images: [] },
				external_urls: { spotify: track.url || "" },
				duration_ms: 0,
			}
		: null;

	// Update Slack status
	await setUserStatus(user, spotifyLikeTrack, isPlaying);

	// Update user record
	await db
		.update(schema.users)
		.set({
			lastSource: track?.source || null,
			lastTrackId: track ? `${track.source}:${track.title}:${track.artist}` : null,
			lastTrackName: track?.title || null,
			lastArtistName: track?.artist || null,
			isCurrentlyPlaying: isPlaying,
			lastPolledAt: new Date(),
		})
		.where(eq(schema.users.id, user.id));

	return c.json({ ok: true });
});

// Check extension connection status
extension.get("/status", async (c) => {
	const token = c.req.header("X-Extension-Token");
	const user = await getUser(token);

	if (!user) {
		return c.json({ error: "Invalid token" }, 401);
	}

	return c.json({
		ok: true,
		userId: user.id,
		isSharing: user.isSharing,
		lastSource: user.lastSource,
	});
});

export { extension };
