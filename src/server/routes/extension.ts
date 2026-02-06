import { db, schema } from "@db/index";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { hashToken } from "../services/crypto";
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

// Validate extension token by comparing SHA-256 hash
async function getUser(token: string | undefined) {
	if (!token) return null;

	const hashed = hashToken(token);
	const user = await db.query.users.findFirst({
		where: eq(schema.users.extensionToken, hashed),
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

	let body: NowPlayingPayload;
	try {
		body = await c.req.json<NowPlayingPayload>();
	} catch {
		return c.json({ error: "Invalid JSON" }, 400);
	}

	// Validate payload types
	if (typeof body.isPlaying !== "boolean" || typeof body.timestamp !== "number") {
		return c.json(
			{ error: "Invalid payload: isPlaying must be boolean, timestamp must be number" },
			400
		);
	}

	if (body.track !== null && body.track !== undefined) {
		const { track } = body;
		if (
			typeof track.title !== "string" ||
			typeof track.artist !== "string" ||
			typeof track.source !== "string"
		) {
			return c.json({ error: "Invalid track fields" }, 400);
		}
		if (track.title.length > 500 || track.artist.length > 500) {
			return c.json({ error: "Track title/artist too long (max 500)" }, 400);
		}
		if (track.url && track.url.length > 2000) {
			return c.json({ error: "Track URL too long (max 2000)" }, 400);
		}
	}

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

// Get latest extension version (for update notifications)
const LATEST_EXTENSION_VERSION = "1.0.0";

extension.get("/version", (c) => {
	return c.json({
		version: LATEST_EXTENSION_VERSION,
		downloadUrl: "https://www.vibesbeingtransmitted.com/vibes-extension.zip",
		firefoxDownloadUrl: "https://www.vibesbeingtransmitted.com/vibes-extension-firefox.zip",
	});
});

export { extension };
