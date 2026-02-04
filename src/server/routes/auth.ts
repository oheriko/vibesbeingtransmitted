import { db, schema } from "@db/index";
import type { SlackOAuthResponse, SpotifyTokenResponse } from "@shared/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { config } from "../config";
import { encrypt } from "../services/crypto";

const auth = new Hono();

// Slack OAuth - Install flow
auth.get("/slack", async (c) => {
	const code = c.req.query("code");
	const error = c.req.query("error");

	if (error) {
		return c.redirect(`/?error=${encodeURIComponent(error)}`);
	}

	if (!code) {
		// Redirect to Slack OAuth
		const scopes = ["commands", "chat:write", "users:read"];
		const userScopes = ["users.profile:write", "users.profile:read"];
		const redirectUri = `${config.appUrl}/auth/slack`;

		const url = new URL("https://slack.com/oauth/v2/authorize");
		url.searchParams.set("client_id", config.slack.clientId);
		url.searchParams.set("scope", scopes.join(","));
		url.searchParams.set("user_scope", userScopes.join(","));
		url.searchParams.set("redirect_uri", redirectUri);

		return c.redirect(url.toString());
	}

	// Exchange code for tokens
	const response = await fetch("https://slack.com/api/oauth.v2.access", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: config.slack.clientId,
			client_secret: config.slack.clientSecret,
			code,
			redirect_uri: `${config.appUrl}/auth/slack`,
		}),
	});

	const data = (await response.json()) as SlackOAuthResponse & { error?: string };

	if (!data.ok || data.error) {
		console.error("Slack OAuth error:", data.error);
		return c.redirect(`/?error=${encodeURIComponent(data.error || "oauth_failed")}`);
	}

	// Store workspace (bot token)
	const encryptedBotToken = await encrypt(data.access_token);
	await db
		.insert(schema.workspaces)
		.values({
			id: data.team.id,
			name: data.team.name,
			botAccessToken: encryptedBotToken,
			botUserId: data.bot_user_id,
		})
		.onConflictDoUpdate({
			target: schema.workspaces.id,
			set: {
				name: data.team.name,
				botAccessToken: encryptedBotToken,
				botUserId: data.bot_user_id,
			},
		});

	// Store user (user token for status updates)
	const encryptedUserToken = await encrypt(data.authed_user.access_token);
	await db
		.insert(schema.users)
		.values({
			id: data.authed_user.id,
			workspaceId: data.team.id,
			slackAccessToken: encryptedUserToken,
		})
		.onConflictDoUpdate({
			target: schema.users.id,
			set: {
				slackAccessToken: encryptedUserToken,
			},
		});

	return c.redirect(`/dashboard?installed=true`);
});

// Spotify OAuth - User connection flow
auth.get("/spotify", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state"); // Contains userId
	const error = c.req.query("error");

	if (error) {
		return c.redirect(`/dashboard?error=${encodeURIComponent(error)}`);
	}

	if (!code || !state) {
		// This shouldn't happen - Spotify OAuth should be initiated with state
		return c.redirect("/dashboard?error=invalid_request");
	}

	// Exchange code for tokens
	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: config.spotify.redirectUri || `${config.appUrl}/auth/spotify`,
		}),
	});

	const data = (await response.json()) as SpotifyTokenResponse & { error?: string };

	if (data.error) {
		console.error("Spotify OAuth error:", data.error);
		return c.redirect(`/dashboard?error=${encodeURIComponent(data.error)}`);
	}

	// Decrypt state to get userId
	const userId = state;

	// Update user with Spotify tokens
	const encryptedAccessToken = await encrypt(data.access_token);
	const encryptedRefreshToken = data.refresh_token ? await encrypt(data.refresh_token) : null;
	const expiresAt = new Date(Date.now() + data.expires_in * 1000);

	await db
		.update(schema.users)
		.set({
			spotifyAccessToken: encryptedAccessToken,
			spotifyRefreshToken: encryptedRefreshToken,
			spotifyExpiresAt: expiresAt,
			isSharing: true, // Enable sharing by default after connection
			pollErrorCount: 0,
		})
		.where(eq(schema.users.id, userId));

	return c.redirect("/dashboard?spotify=connected");
});

// Initiate Spotify OAuth (called from slash command or dashboard)
auth.get("/spotify/start", async (c) => {
	const userId = c.req.query("user_id");

	if (!userId) {
		return c.json({ error: "Missing user_id" }, 400);
	}

	// Verify user exists
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	const scopes = ["user-read-playback-state", "user-read-currently-playing"];
	const redirectUri = config.spotify.redirectUri || `${config.appUrl}/auth/spotify`;

	const url = new URL("https://accounts.spotify.com/authorize");
	url.searchParams.set("client_id", config.spotify.clientId);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("scope", scopes.join(" "));
	url.searchParams.set("state", userId);

	return c.redirect(url.toString());
});

export { auth };
