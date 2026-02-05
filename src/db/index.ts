import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const databasePath = process.env.DATABASE_PATH || "./vibes.db";

const sqlite = new Database(databasePath);
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

// Initialize database with schema (creates tables if they don't exist)
export function initializeDatabase(): void {
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS workspaces (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			bot_access_token TEXT NOT NULL,
			bot_user_id TEXT NOT NULL,
			installed_at INTEGER NOT NULL DEFAULT (unixepoch())
		);

		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
			slack_access_token TEXT NOT NULL,
			spotify_access_token TEXT,
			spotify_refresh_token TEXT,
			spotify_expires_at INTEGER,
			extension_token TEXT,
			is_sharing INTEGER NOT NULL DEFAULT 0,
			last_source TEXT,
			last_track_id TEXT,
			last_track_name TEXT,
			last_artist_name TEXT,
			is_currently_playing INTEGER DEFAULT 0,
			last_polled_at INTEGER,
			poll_error_count INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id);
		CREATE INDEX IF NOT EXISTS idx_users_sharing ON users(is_sharing) WHERE is_sharing = 1;
		CREATE INDEX IF NOT EXISTS idx_users_extension_token ON users(extension_token);
		CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
		CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
	`);

	// Migrations for existing databases
	try {
		sqlite.exec(`ALTER TABLE users ADD COLUMN extension_token TEXT`);
	} catch {
		// Column already exists
	}
	try {
		sqlite.exec(`ALTER TABLE users ADD COLUMN last_source TEXT`);
	} catch {
		// Column already exists
	}
}

export { schema };
