import type { Config } from "@shared/types";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function loadConfig(): Config {
	return {
		appUrl: requireEnv("APP_URL"),
		port: Number.parseInt(process.env.PORT || "3000", 10),
		databasePath: process.env.DATABASE_PATH || "./vibes.db",
		encryptionKey: requireEnv("ENCRYPTION_KEY"),
		betterAuth: {
			secret: requireEnv("BETTER_AUTH_SECRET"),
			url: process.env.BETTER_AUTH_URL || requireEnv("APP_URL"),
		},
		slack: {
			clientId: requireEnv("SLACK_CLIENT_ID"),
			clientSecret: requireEnv("SLACK_CLIENT_SECRET"),
			signingSecret: requireEnv("SLACK_SIGNING_SECRET"),
		},
		spotify: {
			clientId: requireEnv("SPOTIFY_CLIENT_ID"),
			clientSecret: requireEnv("SPOTIFY_CLIENT_SECRET"),
			redirectUri: process.env.SPOTIFY_REDIRECT_URI,
		},
	};
}

export const config = loadConfig();
