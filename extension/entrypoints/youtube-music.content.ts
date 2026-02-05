import type { ContentMessage, NowPlaying } from "@/utils/types";

let lastTrackId: string | null = null;
let lastPlayState: boolean | null = null;
let observer: MutationObserver | null = null;
let progressInterval: number | null = null;
let debounceTimeout: number | null = null;

const SELECTORS = {
	playerBar: "ytmusic-player-bar",
	title: "yt-formatted-string.title.ytmusic-player-bar",
	byline: ".byline.ytmusic-player-bar",
	thumbnail: "img.image.ytmusic-player-bar",
	playButton: "#play-pause-button",
	progressBar: "#progress-bar",
	altTitle: ".content-info-wrapper .title",
	altByline: ".content-info-wrapper .byline",
};

export default defineContentScript({
	matches: ["*://music.youtube.com/*"],
	runAt: "document_idle",
	main(ctx) {
		console.log("[Vibes] YouTube Music content script loaded");

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", waitForPlayer);
		} else {
			waitForPlayer();
		}

		ctx.onInvalidated(() => {
			if (observer) observer.disconnect();
			if (progressInterval) clearInterval(progressInterval);
		});
	},
});

function extractNowPlaying(): NowPlaying | null {
	try {
		const titleElement =
			document.querySelector(SELECTORS.title) || document.querySelector(SELECTORS.altTitle);

		if (!titleElement) return null;

		const title = titleElement.textContent?.trim() || "";
		if (!title) return null;

		// Parse "Artist • Album" format
		const bylineElement =
			document.querySelector(SELECTORS.byline) || document.querySelector(SELECTORS.altByline);
		const byline = bylineElement?.textContent?.trim() || "";
		const parts = byline.split("•").map((s) => s.trim());
		const artist = parts[0] || "Unknown Artist";
		const album = parts[1] || undefined;

		// Thumbnail
		const thumbnailElement = document.querySelector(SELECTORS.thumbnail) as HTMLImageElement | null;
		const thumbnailUrl = thumbnailElement?.src || undefined;

		// Play state
		const playButton = document.querySelector(SELECTORS.playButton);
		const ariaLabel = playButton?.getAttribute("aria-label") || "";
		const isPlaying = !ariaLabel.toLowerCase().includes("play");

		// Progress
		const progressBar = document.querySelector(SELECTORS.progressBar);
		const currentTime = parseInt(progressBar?.getAttribute("value") || "0", 10);
		const duration = parseInt(progressBar?.getAttribute("aria-valuemax") || "0", 10);

		return {
			source: "youtube-music",
			title,
			artist,
			album,
			thumbnailUrl,
			duration,
			currentTime,
			isPlaying,
			timestamp: Date.now(),
			url: window.location.href,
		};
	} catch (error) {
		console.error("[Vibes] Error extracting now playing:", error);
		return null;
	}
}

function getTrackId(track: NowPlaying): string {
	return `${track.title}::${track.artist}`;
}

function sendToBackground(message: ContentMessage): void {
	try {
		browser.runtime.sendMessage(message).catch((error) => {
			console.debug("[Vibes] Background not responding:", error);
		});
	} catch (error) {
		console.error("[Vibes] Error sending message:", error);
	}
}

function handleTrackChange(track: NowPlaying): void {
	console.log("[Vibes] Track changed:", track.title, "by", track.artist);
	sendToBackground({ type: "NOW_PLAYING_UPDATE", track });
	lastTrackId = getTrackId(track);
}

function handlePlayStateChange(isPlaying: boolean, track?: NowPlaying): void {
	console.log("[Vibes] Playback:", isPlaying ? "playing" : "paused");
	sendToBackground({ type: "PLAYBACK_STATE_CHANGE", isPlaying, track });
	lastPlayState = isPlaying;
}

function handleDOMChanges(): void {
	const track = extractNowPlaying();
	if (!track) return;

	const trackId = getTrackId(track);

	// Track changed
	if (trackId !== lastTrackId) {
		handleTrackChange(track);
		lastPlayState = track.isPlaying;
		return;
	}

	// Play state changed
	if (track.isPlaying !== lastPlayState) {
		handlePlayStateChange(track.isPlaying, track);
	}
}

function setupObserver(playerElement: Element): void {
	if (observer) observer.disconnect();

	observer = new MutationObserver(() => {
		if (debounceTimeout) clearTimeout(debounceTimeout);
		debounceTimeout = window.setTimeout(handleDOMChanges, 100);
	});

	observer.observe(playerElement, {
		childList: true,
		subtree: true,
		characterData: true,
		attributes: true,
		attributeFilter: ["value", "aria-label", "aria-valuenow", "aria-valuemax"],
	});

	console.log("[Vibes] Observer setup complete");

	// Initial extraction
	handleDOMChanges();

	// Progress updates every 10s while playing
	if (progressInterval) clearInterval(progressInterval);
	progressInterval = window.setInterval(() => {
		const track = extractNowPlaying();
		if (track?.isPlaying) {
			sendToBackground({
				type: "PROGRESS_UPDATE",
				progress: { currentTime: track.currentTime, duration: track.duration },
			});
		}
	}, 10000);
}

function waitForPlayer(): void {
	console.log("[Vibes] Waiting for player...");

	const checkInterval = setInterval(() => {
		const playerBar = document.querySelector(SELECTORS.playerBar);
		if (playerBar) {
			console.log("[Vibes] Player found!");
			clearInterval(checkInterval);
			setupObserver(playerBar);
		}
	}, 1000);

	// Give up after 30s
	setTimeout(() => {
		clearInterval(checkInterval);
		console.warn("[Vibes] Player not found after 30s");
	}, 30000);
}
