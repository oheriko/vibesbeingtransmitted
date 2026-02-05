import type { User } from "@db/schema";
import { formatStatusEmoji, formatStatusText } from "@shared/format";
import type { SpotifyTrack } from "@shared/types";
import { decrypt } from "./crypto";

interface SlackApiResponse {
	ok: boolean;
	error?: string;
}

export async function setUserStatus(
	user: User,
	track: SpotifyTrack | null,
	isPlaying: boolean
): Promise<boolean> {
	const userToken = await decrypt(user.slackAccessToken);

	let statusText = "";
	let statusEmoji = "";
	let statusExpiration = 0;

	if (track && isPlaying) {
		statusText = formatStatusText(track);
		statusEmoji = formatStatusEmoji();
		// Status expires in 10 minutes (will be refreshed by poller)
		statusExpiration = Math.floor(Date.now() / 1000) + 600;
	}
	// If not playing, we clear the status (empty values)

	const response = await fetch("https://slack.com/api/users.profile.set", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${userToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			profile: {
				status_text: statusText,
				status_emoji: statusEmoji,
				status_expiration: statusExpiration,
			},
		}),
	});

	const data = (await response.json()) as SlackApiResponse;

	if (!data.ok) {
		console.error(`Failed to set status for user ${user.id}:`, data.error);
		return false;
	}

	return true;
}

export async function clearUserStatus(user: User): Promise<boolean> {
	return setUserStatus(user, null, false);
}

interface SlackTextElement {
	type: string;
	text: string;
	emoji?: boolean;
}

interface SlackBlockKitSection {
	type: string;
	text?: SlackTextElement;
	accessory?: {
		type: string;
		text?: SlackTextElement;
		action_id?: string;
		url?: string;
		style?: string;
	};
	elements?: Array<
		| {
				type: string;
				text?: SlackTextElement;
				action_id?: string;
				url?: string;
				style?: string;
		  }
		| SlackTextElement
	>;
}

export function buildAppHomeView(
	user: User | null,
	appUrl: string
): { type: "home"; blocks: SlackBlockKitSection[] } {
	const blocks: SlackBlockKitSection[] = [];

	// Header
	blocks.push({
		type: "header",
		text: {
			type: "plain_text",
			text: "🎵 Vibes Being Transmitted",
			emoji: true,
		},
	});

	blocks.push({
		type: "section",
		text: {
			type: "mrkdwn",
			text: "Share what you're listening to on Spotify with your team through your Slack status.",
		},
	});

	blocks.push({ type: "divider" });

	if (!user) {
		// User hasn't installed yet
		blocks.push({
			type: "section",
			text: {
				type: "mrkdwn",
				text: "👋 Welcome! To get started, install the app to your workspace.",
			},
			accessory: {
				type: "button",
				text: {
					type: "plain_text",
					text: "Install App",
					emoji: true,
				},
				url: `${appUrl}/auth/slack`,
				action_id: "install_app",
			},
		});
	} else if (!user.spotifyAccessToken) {
		// User needs to connect Spotify
		blocks.push({
			type: "section",
			text: {
				type: "mrkdwn",
				text: "✅ *Slack Connected*\n\n🔗 Connect your Spotify account to start sharing what you're listening to.",
			},
			accessory: {
				type: "button",
				text: {
					type: "plain_text",
					text: "Connect Spotify",
					emoji: true,
				},
				url: `${appUrl}/auth/spotify/start?user_id=${user.id}`,
				action_id: "connect_spotify",
				style: "primary",
			},
		});
	} else {
		// User is fully connected
		const statusIcon = user.isSharing ? "🟢" : "⏸️";
		const statusText = user.isSharing ? "Sharing enabled" : "Sharing paused";
		const toggleText = user.isSharing ? "Pause Sharing" : "Resume Sharing";
		const toggleAction = user.isSharing ? "pause_sharing" : "resume_sharing";

		blocks.push({
			type: "section",
			text: {
				type: "mrkdwn",
				text: `✅ *Slack Connected*\n✅ *Spotify Connected*\n\n${statusIcon} *Status:* ${statusText}`,
			},
		});

		if (user.lastTrackName && user.isCurrentlyPlaying) {
			blocks.push({
				type: "section",
				text: {
					type: "mrkdwn",
					text: `🎵 *Now Playing:*\n${user.lastTrackName} - ${user.lastArtistName || "Unknown Artist"}`,
				},
			});
		}

		blocks.push({
			type: "actions",
			elements: [
				{
					type: "button",
					text: {
						type: "plain_text",
						text: toggleText,
						emoji: true,
					},
					action_id: toggleAction,
					style: user.isSharing ? undefined : "primary",
				},
				{
					type: "button",
					text: {
						type: "plain_text",
						text: "Get Extension Token",
						emoji: true,
					},
					action_id: "get_extension_token",
				},
			],
		});
	}

	blocks.push({ type: "divider" });

	blocks.push({
		type: "context",
		elements: [
			{
				type: "mrkdwn",
				text: "Use `/vibes` for quick commands: `connect`, `pause`, `resume`, `status`",
			},
		],
	});

	return {
		type: "home",
		blocks,
	};
}

export async function publishAppHome(
	botToken: string,
	userId: string,
	view: { type: "home"; blocks: SlackBlockKitSection[] }
): Promise<boolean> {
	const token = await decrypt(botToken);

	const response = await fetch("https://slack.com/api/views.publish", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			user_id: userId,
			view,
		}),
	});

	const data = (await response.json()) as SlackApiResponse;

	if (!data.ok) {
		console.error(`Failed to publish app home for user ${userId}:`, data.error);
		return false;
	}

	return true;
}

export async function openTokenModal(
	botToken: string,
	triggerId: string,
	token: string
): Promise<boolean> {
	const decryptedToken = await decrypt(botToken);

	const response = await fetch("https://slack.com/api/views.open", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${decryptedToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			trigger_id: triggerId,
			view: {
				type: "modal",
				title: { type: "plain_text", text: "Extension Token" },
				close: { type: "plain_text", text: "Done" },
				blocks: [
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: "Copy this token into the Vibes browser extension to connect YouTube Music:",
						},
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `\`${token}\``,
						},
					},
					{
						type: "context",
						elements: [
							{
								type: "mrkdwn",
								text: "_Keep this token secret - anyone with it can update your status._",
							},
						],
					},
				],
			},
		}),
	});

	const data = (await response.json()) as SlackApiResponse;

	if (!data.ok) {
		console.error(`Failed to open token modal:`, data.error);
		return false;
	}

	return true;
}
