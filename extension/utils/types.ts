export interface NowPlaying {
	source: "youtube-music" | "spotify";
	title: string;
	artist: string;
	album?: string;
	thumbnailUrl?: string;
	duration: number;
	currentTime: number;
	isPlaying: boolean;
	timestamp: number;
	url?: string;
}

export interface ExtensionConfig {
	apiToken: string;
	serverUrl: string;
	enabled: boolean;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
	apiToken: "",
	serverUrl: "https://vibesbeingtransmitted.com",
	enabled: true,
};

export type ContentMessage =
	| { type: "NOW_PLAYING_UPDATE"; track: NowPlaying }
	| { type: "PLAYBACK_STATE_CHANGE"; isPlaying: boolean; track?: NowPlaying }
	| { type: "PROGRESS_UPDATE"; progress: { currentTime: number; duration: number } };
