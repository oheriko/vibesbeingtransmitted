// Spotify types
export interface SpotifyTrack {
	id: string;
	name: string;
	artists: Array<{ name: string }>;
	album: {
		name: string;
		images: Array<{ url: string; width: number; height: number }>;
	};
	external_urls: {
		spotify: string;
	};
	duration_ms: number;
}

export interface SpotifyPlaybackState {
	is_playing: boolean;
	item: SpotifyTrack | null;
	progress_ms: number | null;
	device: {
		id: string;
		name: string;
		type: string;
	} | null;
}

export interface SpotifyTokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
	expires_in: number;
	refresh_token?: string;
}

// Slack types
export interface SlackOAuthResponse {
	ok: boolean;
	access_token: string;
	token_type: string;
	scope: string;
	bot_user_id: string;
	app_id: string;
	team: {
		name: string;
		id: string;
	};
	authed_user: {
		id: string;
		scope: string;
		access_token: string;
		token_type: string;
	};
}

export interface SlackProfile {
	status_text: string;
	status_emoji: string;
	status_expiration: number;
}

// App types
export interface UserStatus {
	isConnected: boolean;
	isSharing: boolean;
	currentTrack: {
		name: string;
		artist: string;
		isPlaying: boolean;
	} | null;
}

export interface Config {
	appUrl: string;
	port: number;
	databasePath: string;
	encryptionKey: string;
	slack: {
		clientId: string;
		clientSecret: string;
		signingSecret: string;
	};
	spotify: {
		clientId: string;
		clientSecret: string;
		redirectUri?: string;
	};
}
