import { db, schema } from "@db/index";
import type { SlackOAuthResponse, SpotifyTokenResponse } from "@shared/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { auth as betterAuth } from "../auth";
import { config } from "../config";
import { createSignedState, encrypt, verifySignedState } from "../services/crypto";

const auth = new Hono();

// Slack OAuth - Install flow
auth.get("/slack", async (c) => {
	const code = c.req.query("code");
	const error = c.req.query("error");

	if (error) {
		return c.redirect(`/?error=${encodeURIComponent(error)}`);
	}

	if (!code) {
		// Redirect to Slack OAuth with CSRF state
		const scopes = ["commands", "chat:write", "users:read"];
		const userScopes = ["users.profile:write", "users.profile:read"];
		const redirectUri = `${config.appUrl}/auth/slack`;

		const state = await createSignedState(crypto.randomUUID());

		const url = new URL("https://slack.com/oauth/v2/authorize");
		url.searchParams.set("client_id", config.slack.clientId);
		url.searchParams.set("scope", scopes.join(","));
		url.searchParams.set("user_scope", userScopes.join(","));
		url.searchParams.set("redirect_uri", redirectUri);
		url.searchParams.set("state", state);

		return c.redirect(url.toString());
	}

	// Verify CSRF state
	const state = c.req.query("state");
	if (!state || !(await verifySignedState(state))) {
		return c.redirect("/?error=invalid_state");
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

	// Chain bot install into better-auth Slack sign-in so the user gets a session
	const callbackURL = encodeURIComponent("/dashboard?installed=true");
	return c.redirect(`/api/auth/signin/social?provider=slack&callbackURL=${callbackURL}`);
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

	// Verify signed state to get userId
	const userId = await verifySignedState(state);
	if (!userId) {
		return c.redirect("/dashboard?error=invalid_state");
	}

	// Exchange code for tokens
	const redirectUri = config.spotify.redirectUri || `${config.appUrl}/auth/spotify`;

	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
		}),
	});

	console.log("Spotify token exchange:", response.status === 200 ? "success" : "failed");

	let data: SpotifyTokenResponse & { error?: string; error_description?: string };
	try {
		data = await response.json();
	} catch {
		return c.redirect(`/dashboard?error=${encodeURIComponent("spotify_response_error")}`);
	}

	if (data.error) {
		console.error("Spotify OAuth error:", data.error, data.error_description);
		return c.redirect(`/dashboard?error=${encodeURIComponent(data.error)}`);
	}

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

// Initiate Spotify OAuth — requires authentication:
//   1. Signed state token (from Slack slash commands / App Home)
//   2. better-auth session cookie (from dashboard)
auth.get("/spotify/start", async (c) => {
	let userId: string | null = null;

	// Method 1: Signed state token (from Slack)
	const stateParam = c.req.query("state");
	if (stateParam) {
		userId = await verifySignedState(stateParam);
	}

	// Method 2: better-auth session cookie (from dashboard)
	if (!userId) {
		const authSession = await betterAuth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (authSession) {
			// Look up Slack account linked to this better-auth user
			const slackAccount = await db.query.account.findFirst({
				where: (fields, { and, eq }) =>
					and(eq(fields.userId, authSession.user.id), eq(fields.providerId, "slack")),
			});

			if (slackAccount) {
				userId = slackAccount.accountId;
			}
		}
	}

	if (!userId) {
		return c.json({ error: "Unauthorized — sign in first" }, 401);
	}

	// Verify user exists in our domain table
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	if (!user) {
		return c.json({ error: "User not found — install the Slack app first" }, 404);
	}

	const scopes = ["user-read-playback-state", "user-read-currently-playing"];
	const redirectUri = config.spotify.redirectUri || `${config.appUrl}/auth/spotify`;

	const url = new URL("https://accounts.spotify.com/authorize");
	url.searchParams.set("client_id", config.spotify.clientId);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("scope", scopes.join(" "));
	const signedState = await createSignedState(userId);
	url.searchParams.set("state", signedState);

	return c.redirect(url.toString());
});

export { auth };
