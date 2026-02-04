# Architecture

## Overview

Vibes Being Transmitted is a Slack app that bridges Spotify and Slack, polling users' current playback and updating their Slack status accordingly.

## System Design

### Architecture Pattern
- Pattern: Slack App (event-driven + polling)
- Rationale: Slack apps require specific interaction patterns; Spotify doesn't push playback events so polling is necessary

### Components

```
┌──────────────────────────────────────────────────────────────┐
│                    Bun Server (Hono)                         │
├──────────────────────────────────────────────────────────────┤
│  Routes:                    │  Background:                   │
│  ├─ GET /auth/slack         │  └─ Polling loop (every 15s)   │
│  ├─ GET /auth/spotify       │      ├─ Check Spotify playback │
│  ├─ POST /slack/events      │      └─ Update Slack status    │
│  ├─ POST /slack/commands    │                                │
│  └─ /api/* (frontend API)   │                                │
├──────────────────────────────────────────────────────────────┤
│  React Frontend (Bun bundled)                                │
│  ├─ Landing page (Add to Slack)                              │
│  └─ Dashboard (connection status, controls)                  │
└──────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   ┌───────────┐                 ┌───────────┐
   │  SQLite   │                 │  Slack &  │
   │ (Drizzle) │                 │  Spotify  │
   └───────────┘                 │   APIs    │
                                 └───────────┘
```

#### Slack Integration
- **Purpose:** Update user status, handle app installation, provide App Home and slash commands
- **Technology:** Hono + native Slack API calls
- **Responsibilities:**
  - OAuth flow for workspace installation (bot + user tokens)
  - Status updates via `users.profile.set`
  - App Home tab with connection status and controls
  - `/vibes` slash command for quick actions

#### Spotify Integration
- **Purpose:** Read current playback state for authenticated users
- **Technology:** Spotify Web API
- **Responsibilities:**
  - OAuth flow for user authorization
  - Poll `/me/player` endpoint
  - Automatic token refresh

#### Polling Service
- **Purpose:** Periodically check Spotify playback and sync to Slack
- **Technology:** Bun background task
- **Responsibilities:**
  - Schedule playback checks (15s interval, 30s per user minimum)
  - Batch processing (10 users per cycle)
  - Track change detection
  - Error handling with automatic pause after 5 failures

## Technology Stack

### Runtime
- **Runtime:** Bun (exclusively - no Node.js)
- **Language:** TypeScript (strict mode)
- **Linting/Formatting:** Biome

### Backend
- **Framework:** Hono
- **API style:** REST (for OAuth callbacks, Slack events, frontend API)

### Frontend
- **Framework:** React 19
- **Bundler:** Bun's built-in bundler
- **Styling:** Inline styles (CSS-in-JS)

### Database
- **Primary database:** SQLite (bun:sqlite)
- **ORM:** Drizzle ORM
- **Encryption:** AES-256-GCM for OAuth tokens

## Data Model

### Database Schema

```
workspaces
├── id: text (Slack team_id) [PK]
├── name: text
├── bot_access_token: text (encrypted)
├── bot_user_id: text
└── installed_at: timestamp

users
├── id: text (Slack user_id) [PK]
├── workspace_id: text [FK → workspaces]
├── slack_access_token: text (encrypted - user token)
├── spotify_access_token: text (encrypted)
├── spotify_refresh_token: text (encrypted)
├── spotify_expires_at: timestamp
├── is_sharing: boolean
├── last_track_id: text
├── last_track_name: text
├── last_artist_name: text
├── is_currently_playing: boolean
├── last_polled_at: timestamp
└── poll_error_count: integer

sessions
├── id: text (UUID) [PK]
├── user_id: text [FK → users]
└── expires_at: timestamp
```

## API Design

### Endpoints

```
# OAuth
GET  /auth/slack              # Slack OAuth initiate/callback
GET  /auth/spotify            # Spotify OAuth callback
GET  /auth/spotify/start      # Initiate Spotify OAuth

# Slack
POST /slack/events            # Event subscriptions (URL verification, app_home_opened)
POST /slack/commands          # Slash command handler
POST /slack/interactions      # Interactive components (buttons)

# Frontend API
GET  /api/user/status         # Get user connection/sharing status
POST /api/user/sharing        # Toggle sharing on/off
POST /api/user/disconnect     # Disconnect Spotify
GET  /api/spotify/connect-url # Get Spotify OAuth URL
```

### Authentication
- **Slack:** OAuth 2.0 with bot scopes (commands, chat:write, users:read) and user scopes (users.profile:write, users.profile:read)
- **Spotify:** OAuth 2.0 with user-read-playback-state, user-read-currently-playing

## Data Flow

1. User installs Slack app → Bot token + User token stored (encrypted)
2. User connects Spotify via `/vibes connect` or App Home → Spotify tokens stored (encrypted)
3. Polling service checks Spotify playback for users with `is_sharing=true`
4. On track change → Update Slack status with track name and artist
5. When playback stops → Clear Slack status

## Security Architecture

- **Authentication:** OAuth 2.0 for both Slack and Spotify
- **Token storage:** AES-256-GCM encryption at rest
- **Signature verification:** Slack request signatures verified with HMAC-SHA256
- **No credential storage:** Only OAuth tokens, never passwords
- **Scopes:** Minimal required scopes only

## Polling Strategy

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Batch interval | 15 seconds | Spread API load |
| Batch size | 10 users | Stay within rate limits |
| Per-user minimum | 30 seconds | Balance freshness vs. limits |
| Max errors | 5 | Pause problematic users |

## Development Environment

- **Prerequisites:** Bun, Biome
- **Setup:** `bun install`
- **Run:** `bun run dev`
- **Build:** `bun run build`
- **Lint:** `bun run lint`
- **Format:** `bun run format`

### Environment Variables

```bash
APP_URL=https://vibesbeingtransmitted.com
PORT=3000
DATABASE_PATH=./vibes.db
ENCRYPTION_KEY=<32-byte-hex>

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
# Optional: Override redirect URI for local dev
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/auth/spotify
```

### Local Development

For local development, you need a tunnel for Slack (which requires public URLs) while Spotify can use localhost:

1. Start the server: `bun run dev`
2. Start a tunnel: `cloudflared tunnel --url http://localhost:3000`
3. Update Slack app URLs to the tunnel URL
4. Set `SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/auth/spotify` for Spotify OAuth

## Project Structure

```
src/
├── client/                    # React frontend
│   ├── pages/
│   │   ├── Landing.tsx
│   │   └── Dashboard.tsx
│   ├── App.tsx
│   └── index.tsx
│
├── server/                    # Hono backend
│   ├── routes/
│   │   ├── auth.ts            # OAuth (Slack + Spotify)
│   │   ├── slack.ts           # Events, commands, interactions
│   │   └── api.ts             # Frontend API
│   ├── services/
│   │   ├── slack.ts           # Slack API wrapper
│   │   ├── spotify.ts         # Spotify API wrapper
│   │   ├── poller.ts          # Background polling
│   │   └── crypto.ts          # Token encryption
│   ├── middleware/
│   │   └── slack.ts           # Request signature verification
│   ├── config.ts
│   └── index.ts
│
├── db/
│   ├── schema.ts              # Drizzle schema
│   └── index.ts               # Connection
│
└── shared/
    ├── types.ts
    └── format.ts              # Status text formatting
```
