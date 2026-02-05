import type { ContentMessage, ExtensionConfig, NowPlaying } from "@/utils/types";
import { DEFAULT_CONFIG } from "@/utils/types";

let config: ExtensionConfig = DEFAULT_CONFIG;
let lastSentTrackId: string | null = null;
let lastSentPlayState: boolean | null = null;

export default defineBackground(() => {
	console.log("[Vibes] Background script loaded");

	// Load config on startup
	loadConfig();

	// Listen for config changes
	browser.storage.onChanged.addListener((changes, area) => {
		if (area === "local" && changes.config) {
			config = { ...DEFAULT_CONFIG, ...changes.config.newValue };
			console.log("[Vibes] Config updated:", {
				serverUrl: config.serverUrl,
				enabled: config.enabled,
				hasToken: !!config.apiToken,
			});
		}
	});

	// Listen for messages from content scripts
	browser.runtime.onMessage.addListener(handleMessage);

	// Clear status when extension starts (in case browser was closed while playing)
	loadConfig().then(() => {
		if (config.enabled && config.apiToken) {
			sendToServer(null, false);
		}
	});
});

async function loadConfig(): Promise<void> {
	const stored = await browser.storage.local.get("config");
	if (stored.config) {
		config = { ...DEFAULT_CONFIG, ...stored.config };
	}
	console.log("[Vibes] Config loaded:", {
		serverUrl: config.serverUrl,
		enabled: config.enabled,
		hasToken: !!config.apiToken,
	});
}

async function sendToServer(track: NowPlaying | null, isPlaying: boolean): Promise<void> {
	if (!config.enabled || !config.apiToken) {
		console.debug("[Vibes] Not sending - disabled or no token");
		return;
	}

	try {
		const response = await fetch(`${config.serverUrl}/api/extension/now-playing`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Extension-Token": config.apiToken,
			},
			body: JSON.stringify({
				track: isPlaying ? track : null,
				isPlaying,
				timestamp: Date.now(),
			}),
		});

		if (!response.ok) {
			console.error("[Vibes] Server error:", response.status);
		}
	} catch (error) {
		console.error("[Vibes] Failed to send to server:", error);
	}
}

function getTrackId(track: NowPlaying): string {
	return `${track.title}::${track.artist}`;
}

function handleMessage(
	message: ContentMessage,
	_sender: browser.runtime.MessageSender,
	sendResponse: (response?: { ok: boolean }) => void
): boolean {
	console.log("[Vibes] Received:", message.type);

	switch (message.type) {
		case "NOW_PLAYING_UPDATE": {
			if (message.track) {
				const trackId = getTrackId(message.track);
				// Only send if track actually changed
				if (trackId !== lastSentTrackId) {
					sendToServer(message.track, message.track.isPlaying);
					lastSentTrackId = trackId;
					lastSentPlayState = message.track.isPlaying;
				}
			}
			break;
		}

		case "PLAYBACK_STATE_CHANGE": {
			const isPlaying = message.isPlaying ?? false;
			// Only send if state actually changed
			if (isPlaying !== lastSentPlayState) {
				sendToServer(message.track ?? null, isPlaying);
				lastSentPlayState = isPlaying;
				// Clear track if paused
				if (!isPlaying) {
					lastSentTrackId = null;
				}
			}
			break;
		}

		case "PROGRESS_UPDATE": {
			// We don't need to send progress to the server for now
			break;
		}
	}

	sendResponse({ ok: true });
	return true;
}
