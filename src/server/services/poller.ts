import { db, schema } from "@db/index";
import type { User } from "@db/schema";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { clearUserStatus, setUserStatus } from "./slack";
import { getPlaybackState } from "./spotify";

const POLL_INTERVAL_MS = 15_000; // 15 seconds
const BATCH_SIZE = 10;
const MIN_USER_POLL_INTERVAL_MS = 30_000; // 30 seconds per user
const MAX_ERROR_COUNT = 5;

let isRunning = false;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;

export function startPoller(): void {
	if (isRunning) {
		return;
	}

	isRunning = true;
	console.log("Poller started");
	schedulePoll();
}

export function stopPoller(): void {
	isRunning = false;
	if (pollTimeout) {
		clearTimeout(pollTimeout);
		pollTimeout = null;
	}
	console.log("Poller stopped");
}

function schedulePoll(): void {
	if (!isRunning) {
		return;
	}

	pollTimeout = setTimeout(async () => {
		await pollBatch();
		schedulePoll();
	}, POLL_INTERVAL_MS);
}

async function pollBatch(): Promise<void> {
	const now = new Date();
	const minPollTime = new Date(now.getTime() - MIN_USER_POLL_INTERVAL_MS);

	// Get users who:
	// - Have sharing enabled
	// - Have Spotify connected
	// - Haven't been polled recently (or never polled)
	// - Haven't exceeded error count
	const users = await db.query.users.findMany({
		where: and(
			eq(schema.users.isSharing, true),
			lt(schema.users.pollErrorCount, MAX_ERROR_COUNT),
			or(isNull(schema.users.lastPolledAt), lt(schema.users.lastPolledAt, minPollTime))
		),
		limit: BATCH_SIZE,
	});

	if (users.length === 0) {
		return;
	}

	console.log(`Polling ${users.length} users`);

	// Process users concurrently
	await Promise.all(users.map((user) => pollUser(user)));
}

async function pollUser(user: User): Promise<void> {
	try {
		if (!user.spotifyAccessToken) {
			console.log(`User ${user.id}: No Spotify token`);
			return;
		}

		// Skip Spotify polling if user is actively using YouTube Music extension
		// (extension updated within last 2 minutes)
		if (user.lastSource === "youtube-music" && user.lastPolledAt) {
			const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
			if (user.lastPolledAt > twoMinutesAgo) {
				console.log(`User ${user.id}: Skipping Spotify poll, using YouTube Music extension`);
				return;
			}
		}

		const playback = await getPlaybackState(user);

		const isPlaying = playback?.is_playing ?? false;
		const currentTrack = playback?.item ?? null;
		const currentTrackId = currentTrack?.id ?? null;

		console.log(`User ${user.id}: isPlaying=${isPlaying}, track=${currentTrack?.name || "none"}`);

		// Determine if we need to update Slack status
		const trackChanged = currentTrackId !== user.lastTrackId;
		const playingStateChanged = isPlaying !== user.isCurrentlyPlaying;

		if (trackChanged || playingStateChanged) {
			console.log(
				`User ${user.id}: Updating status (trackChanged=${trackChanged}, playingStateChanged=${playingStateChanged})`
			);
			// Update Slack status
			const success = await setUserStatus(user, currentTrack, isPlaying);

			if (!success) {
				await incrementErrorCount(user);
				return;
			}
			console.log(`User ${user.id}: Status updated successfully`);
		}

		// Update user state in database
		await db
			.update(schema.users)
			.set({
				lastSource: isPlaying ? "spotify" : null,
				lastTrackId: currentTrackId,
				lastTrackName: currentTrack?.name ?? null,
				lastArtistName: currentTrack?.artists?.[0]?.name ?? null,
				isCurrentlyPlaying: isPlaying,
				lastPolledAt: new Date(),
				pollErrorCount: 0, // Reset error count on success
			})
			.where(eq(schema.users.id, user.id));
	} catch (error) {
		console.error(`Error polling user ${user.id}:`, error);
		await incrementErrorCount(user);
	}
}

async function incrementErrorCount(user: User): Promise<void> {
	const newCount = user.pollErrorCount + 1;

	await db
		.update(schema.users)
		.set({
			pollErrorCount: newCount,
			lastPolledAt: new Date(),
		})
		.where(eq(schema.users.id, user.id));

	if (newCount >= MAX_ERROR_COUNT) {
		console.warn(`User ${user.id} reached max error count, pausing polling`);
		// Clear their status when we stop polling
		try {
			await clearUserStatus(user);
		} catch {
			// Ignore errors when clearing status
		}
	}
}
