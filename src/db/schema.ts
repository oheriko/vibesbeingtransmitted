import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
	id: text("id").primaryKey(), // Slack team_id
	name: text("name").notNull(),
	botAccessToken: text("bot_access_token").notNull(), // Encrypted
	botUserId: text("bot_user_id").notNull(),
	installedAt: integer("installed_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const users = sqliteTable("users", {
	id: text("id").primaryKey(), // Slack user_id
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	slackAccessToken: text("slack_access_token").notNull(), // Encrypted - user token for status updates
	// Spotify OAuth
	spotifyAccessToken: text("spotify_access_token"), // Encrypted
	spotifyRefreshToken: text("spotify_refresh_token"), // Encrypted
	spotifyExpiresAt: integer("spotify_expires_at", { mode: "timestamp" }),
	// Extension token (for YouTube Music, etc.)
	extensionToken: text("extension_token"), // Plain text - used to auth extension
	// Status
	isSharing: integer("is_sharing", { mode: "boolean" }).notNull().default(false),
	lastSource: text("last_source"), // 'spotify' | 'youtube-music' | null
	lastTrackId: text("last_track_id"),
	lastTrackName: text("last_track_name"),
	lastArtistName: text("last_artist_name"),
	isCurrentlyPlaying: integer("is_currently_playing", { mode: "boolean" }).default(false),
	lastPolledAt: integer("last_polled_at", { mode: "timestamp" }),
	pollErrorCount: integer("poll_error_count").notNull().default(0),
});

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(), // UUID
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// Type exports
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
