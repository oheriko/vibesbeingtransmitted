import { db, schema } from "@db/index";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { config } from "../config";
import { verifySlackRequest } from "../middleware/slack";
import { createSignedState, hashToken } from "../services/crypto";
import { buildAppHomeView, openTokenModal, publishAppHome } from "../services/slack";

type Env = { Variables: { rawBody: string } };

const slack = new Hono<Env>();

// Slack Events API
slack.post("/events", verifySlackRequest, async (c) => {
	const rawBody = c.get("rawBody");
	let body: {
		type?: string;
		challenge?: string;
		team_id?: string;
		event?: { type?: string; user?: string };
	};
	try {
		body = JSON.parse(rawBody);
	} catch {
		return c.json({ error: "Invalid JSON" }, 400);
	}

	// URL Verification challenge
	if (body.type === "url_verification") {
		return c.json({ challenge: body.challenge });
	}

	// Handle events
	if (body.type === "event_callback") {
		const event = body.event;

		if (event?.type === "app_home_opened" && event.user && body.team_id) {
			await handleAppHomeOpened(event.user, body.team_id);
		}
	}

	return c.json({ ok: true });
});

// Slash Commands
slack.post("/commands", verifySlackRequest, async (c) => {
	const rawBody = c.get("rawBody");
	const params = new URLSearchParams(rawBody);

	const command = params.get("command");
	const text = params.get("text")?.trim() || "";
	const userId = params.get("user_id");
	const teamId = params.get("team_id");

	if (command !== "/vibes" || !userId || !teamId) {
		return c.json({ response_type: "ephemeral", text: "Invalid command" });
	}

	const subcommand = text.split(" ")[0].toLowerCase();

	switch (subcommand) {
		case "connect":
			return handleConnectCommand(c, userId, teamId);
		case "pause":
			return handlePauseCommand(c, userId);
		case "resume":
			return handleResumeCommand(c, userId);
		case "status":
			return handleStatusCommand(c, userId);
		case "disconnect":
			return handleDisconnectCommand(c, userId);
		case "token":
			return handleTokenCommand(c, userId);
		default:
			return c.json({
				response_type: "ephemeral",
				text: "*Vibes Being Transmitted* 🎵\n\nCommands:\n• `/vibes connect` - Connect Spotify\n• `/vibes token` - Get token for browser extension (YouTube Music)\n• `/vibes pause` - Pause status sharing\n• `/vibes resume` - Resume status sharing\n• `/vibes status` - Check your current status\n• `/vibes disconnect` - Disconnect services",
			});
	}
});

// Interactive Components (button clicks from App Home)
slack.post("/interactions", verifySlackRequest, async (c) => {
	const rawBody = c.get("rawBody");
	const params = new URLSearchParams(rawBody);
	const payloadStr = params.get("payload");

	if (!payloadStr) {
		return c.json({ ok: false });
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(payloadStr);
	} catch {
		return c.json({ error: "Invalid JSON payload" }, 400);
	}
	const payload = parsed as {
		user?: { id?: string };
		team?: { id?: string };
		actions?: Array<{ action_id?: string }>;
		trigger_id?: string;
	};
	const userId = payload.user?.id;
	const teamId = payload.team?.id;
	const action = payload.actions?.[0];

	if (!userId || !action) {
		return c.json({ ok: false });
	}

	switch (action.action_id) {
		case "pause_sharing": {
			await db.update(schema.users).set({ isSharing: false }).where(eq(schema.users.id, userId));
			await refreshAppHome(userId, teamId);
			break;
		}
		case "resume_sharing": {
			await db.update(schema.users).set({ isSharing: true }).where(eq(schema.users.id, userId));
			await refreshAppHome(userId, teamId);
			break;
		}
		case "get_extension_token": {
			const user = await db.query.users.findFirst({
				where: eq(schema.users.id, userId),
			});

			if (!user) {
				break;
			}

			const workspace = await db.query.workspaces.findFirst({
				where: eq(schema.workspaces.id, teamId),
			});

			if (!workspace) {
				break;
			}

			// Always generate a fresh token, store the hash
			const plainToken = crypto.randomUUID();
			await db
				.update(schema.users)
				.set({ extensionToken: hashToken(plainToken) })
				.where(eq(schema.users.id, userId));

			await openTokenModal(workspace.botAccessToken, payload.trigger_id || "", plainToken);
			break;
		}
	}

	return c.json({ ok: true });
});

async function handleAppHomeOpened(userId: string, teamId: string): Promise<void> {
	await refreshAppHome(userId, teamId);
}

async function refreshAppHome(userId: string, teamId: string): Promise<void> {
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	const workspace = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.id, teamId),
	});

	if (!workspace) {
		return;
	}

	const view = await buildAppHomeView(user || null, config.appUrl);
	await publishAppHome(workspace.botAccessToken, userId, view);
}

async function handleConnectCommand(c: Context<Env>, userId: string, _teamId: string) {
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	if (!user) {
		return c.json({
			response_type: "ephemeral",
			text: "Please install the app first by visiting your App Home tab.",
		});
	}

	if (user.spotifyAccessToken) {
		return c.json({
			response_type: "ephemeral",
			text: "Your Spotify is already connected! Use `/vibes status` to check your status.",
		});
	}

	const signedState = await createSignedState(userId);
	const connectUrl = `${config.appUrl}/auth/spotify/start?state=${encodeURIComponent(signedState)}`;

	return c.json({
		response_type: "ephemeral",
		text: `Click here to connect your Spotify: ${connectUrl}`,
	});
}

async function handlePauseCommand(c: Context<Env>, userId: string) {
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	if (!user || !user.spotifyAccessToken) {
		return c.json({
			response_type: "ephemeral",
			text: "Please connect Spotify first with `/vibes connect`",
		});
	}

	await db.update(schema.users).set({ isSharing: false }).where(eq(schema.users.id, userId));

	return c.json({
		response_type: "ephemeral",
		text: "⏸️ Status sharing paused. Use `/vibes resume` to start again.",
	});
}

async function handleResumeCommand(c: Context<Env>, userId: string) {
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	if (!user || !user.spotifyAccessToken) {
		return c.json({
			response_type: "ephemeral",
			text: "Please connect Spotify first with `/vibes connect`",
		});
	}

	await db.update(schema.users).set({ isSharing: true }).where(eq(schema.users.id, userId));

	return c.json({
		response_type: "ephemeral",
		text: "🟢 Status sharing resumed! Your status will update with your next track.",
	});
}

async function handleStatusCommand(c: Context<Env>, userId: string) {
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	if (!user) {
		return c.json({
			response_type: "ephemeral",
			text: "You haven't set up Vibes yet. Visit the App Home to get started!",
		});
	}

	if (!user.spotifyAccessToken) {
		return c.json({
			response_type: "ephemeral",
			text: "Spotify not connected. Use `/vibes connect` to link your account.",
		});
	}

	const statusIcon = user.isSharing ? "🟢" : "⏸️";
	const statusText = user.isSharing ? "Sharing enabled" : "Sharing paused";
	let nowPlaying = "";

	if (user.lastTrackName && user.isCurrentlyPlaying) {
		nowPlaying = `\n🎵 Now playing: ${user.lastTrackName} - ${user.lastArtistName || "Unknown"}`;
	} else if (user.lastTrackName) {
		nowPlaying = `\n⏹️ Last played: ${user.lastTrackName} - ${user.lastArtistName || "Unknown"}`;
	}

	return c.json({
		response_type: "ephemeral",
		text: `${statusIcon} *Status:* ${statusText}${nowPlaying}`,
	});
}

async function handleDisconnectCommand(c: Context<Env>, userId: string) {
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	if (!user || !user.spotifyAccessToken) {
		return c.json({
			response_type: "ephemeral",
			text: "Spotify is not connected.",
		});
	}

	await db
		.update(schema.users)
		.set({
			spotifyAccessToken: null,
			spotifyRefreshToken: null,
			spotifyExpiresAt: null,
			isSharing: false,
			lastTrackId: null,
			lastTrackName: null,
			lastArtistName: null,
			isCurrentlyPlaying: false,
		})
		.where(eq(schema.users.id, userId));

	return c.json({
		response_type: "ephemeral",
		text: "🔌 Spotify disconnected. Your status will no longer update.",
	});
}

async function handleTokenCommand(c: Context<Env>, userId: string) {
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
	});

	if (!user) {
		return c.json({
			response_type: "ephemeral",
			text: "Please install the app first by visiting your App Home tab.",
		});
	}

	// Always generate a fresh token, store the SHA-256 hash
	const plainToken = crypto.randomUUID();
	await db
		.update(schema.users)
		.set({ extensionToken: hashToken(plainToken) })
		.where(eq(schema.users.id, userId));

	return c.json({
		response_type: "ephemeral",
		text: `🔑 *Your Extension Token*\n\n\`${plainToken}\`\n\nPaste this into the Vibes browser extension to connect YouTube Music.\n\n_Keep this token secret - anyone with it can update your status. This token is shown once — run \`/vibes token\` again to generate a new one._`,
	});
}

export { slack };
