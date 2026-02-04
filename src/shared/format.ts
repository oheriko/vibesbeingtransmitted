import type { SpotifyTrack } from "./types";

const MAX_STATUS_LENGTH = 100;
const MUSIC_EMOJI = ":headphones:";

export function formatStatusText(track: SpotifyTrack): string {
	const artistNames = track.artists.map((a) => a.name).join(", ");
	const fullText = `${track.name} - ${artistNames}`;

	if (fullText.length <= MAX_STATUS_LENGTH) {
		return fullText;
	}

	// Truncate with ellipsis
	return `${fullText.slice(0, MAX_STATUS_LENGTH - 1)}…`;
}

export function formatStatusEmoji(): string {
	return MUSIC_EMOJI;
}

export function formatTrackLink(track: SpotifyTrack): string {
	return track.external_urls.spotify;
}

export function formatDuration(ms: number): string {
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
