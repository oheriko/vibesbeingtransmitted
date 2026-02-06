import { db, schema } from "@db/index";
import type { User } from "@db/schema";
import type { SpotifyPlaybackState, SpotifyTokenResponse } from "@shared/types";
import { eq } from "drizzle-orm";
import { config } from "../config";
import { decrypt, encrypt } from "./crypto";

export async function getPlaybackState(
	user: User,
	retried = false
): Promise<SpotifyPlaybackState | null> {
	if (!user.spotifyAccessToken) {
		return null;
	}

	// Check if token needs refresh
	if (user.spotifyExpiresAt && user.spotifyExpiresAt < new Date()) {
		const refreshed = await refreshToken(user);
		if (!refreshed) {
			return null;
		}
	}

	const accessToken = await decrypt(user.spotifyAccessToken);

	const response = await fetch("https://api.spotify.com/v1/me/player", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	// 204 = no active playback
	if (response.status === 204) {
		return null;
	}

	// 401 = token expired, try refresh (only once)
	if (response.status === 401 && !retried) {
		const refreshed = await refreshToken(user);
		if (refreshed) {
			return getPlaybackState(user, true);
		}
		return null;
	}

	if (!response.ok) {
		// 403 = forbidden (revoked access, app quota exceeded, etc.)
		// Throw so the poller increments error count and eventually stops polling
		throw new Error(`Spotify API error ${response.status} for user ${user.id}`);
	}

	return (await response.json()) as SpotifyPlaybackState;
}

async function refreshToken(user: User): Promise<boolean> {
	if (!user.spotifyRefreshToken) {
		console.error(`No refresh token for user ${user.id}`);
		return false;
	}

	const refreshToken = await decrypt(user.spotifyRefreshToken);

	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
	});

	if (!response.ok) {
		console.error(`Failed to refresh token for user ${user.id}: ${response.status}`);
		return false;
	}

	const data = (await response.json()) as SpotifyTokenResponse;

	const encryptedAccessToken = await encrypt(data.access_token);
	const expiresAt = new Date(Date.now() + data.expires_in * 1000);

	const updateData: Partial<User> = {
		spotifyAccessToken: encryptedAccessToken,
		spotifyExpiresAt: expiresAt,
	};

	// Sometimes Spotify returns a new refresh token
	if (data.refresh_token) {
		updateData.spotifyRefreshToken = await encrypt(data.refresh_token);
	}

	await db.update(schema.users).set(updateData).where(eq(schema.users.id, user.id));

	// Update in-memory user object
	user.spotifyAccessToken = encryptedAccessToken;
	user.spotifyExpiresAt = expiresAt;

	return true;
}
