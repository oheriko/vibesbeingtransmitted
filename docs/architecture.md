# Architecture

## Overview

Vibes Being Transmitted is a Slack app that bridges Spotify and Slack, polling users' current playback and updating their Slack status accordingly.

## System Design

### Architecture Pattern
- Pattern: Slack App (event-driven + polling + browser extension)
- Rationale: Slack apps require specific interaction patterns; Spotify doesn't push playback events so polling is necessary; YouTube Music has no API so a browser extension scrapes the DOM

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
│  ├─ POST /api/extension/*   │                                │
│  └─ /api/* (frontend API)   │                                │
├──────────────────────────────────────────────────────────────┤
│  React Frontend (Bun bundled)                                │
│  ├─ Landing page (Add to Slack)                              │
│  ├─ Dashboard (now playing, connections, setup checklist)     │
│  ├─ Privacy page                                             │
│  └─ Support page                                             │
└──────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   ┌───────────┐                 ┌───────────┐
   │  SQLite   │                 │  Slack &  │
   │ (Drizzle) │                 │  Spotify  │
   └───────────┘                 │   APIs    │
                                 └───────────┘
         ▲
         │
   ┌───────────────┐
   │   Browser     │
   │   Extension   │
   │  (WXT/React)  │
   └───────────────┘
```

## Infrastructure

### Production Environment

```
┌─────────────────────────────────────────┐
│           Hetzner Cloud (fsn1)          │
│  ┌───────────────────────────────────┐  │
│  │  cx22 (2 vCPU, 4GB RAM, 40GB SSD) │  │
│  │  Ubuntu 24.04                      │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Caddy (reverse proxy)      │  │  │
│  │  │  - Auto HTTPS (Let's Encrypt)│  │  │
│  │  │  - :80/:443 → localhost:3000│  │  │
│  │  └─────────────────────────────┘  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Bun + Hono App             │  │  │
│  │  │  - systemd managed          │  │  │
│  │  │  - /opt/vibes               │  │  │
│  │  └─────────────────────────────┘  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  SQLite                     │  │  │
│  │  │  - /opt/vibes/vibes.db      │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Infrastructure Management

All infrastructure is managed via bun scripts using the `hcloud` CLI:

| Script | Purpose |
|--------|---------|
| `infra/setup.ts` | Create SSH key, firewall, server with cloud-init |
| `infra/deploy.ts` | Sync code via rsync, restart systemd service |
| `infra/ssh.ts` | SSH into server |
| `infra/status.ts` | Show infrastructure status |
| `infra/logs.ts` | View service logs |
| `infra/destroy.ts` | Tear down all resources |

See [deployment.md](deployment.md) for detailed usage.

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
  - Schedule playback checks (5s interval, 5s per user minimum)
  - Batch processing (10 users per cycle)
  - Track change detection
  - Error handling with automatic pause after 5 failures
  - Defers to YouTube Music extension when it has been active within the last 30s

#### Browser Extension (YouTube Music)
- **Purpose:** Scrape YouTube Music playback state (no official API available)
- **Technology:** WXT + React (Chrome + Firefox)
- **Responsibilities:**
  - Content script monitors YouTube Music DOM for track changes
  - Background script sends updates to server via extension token (SHA-256 hashed in DB)
  - Popup UI for configuration (token, server URL, enable/disable)
  - Available as Chrome and Firefox extension zips

#### Session Management
- **Purpose:** Authenticate users for the web dashboard
- **Technology:** better-auth with Slack social sign-in
- **Responsibilities:**
  - Slack OAuth social sign-in (creates better-auth session)
  - Session cookies for dashboard API access
  - Links better-auth users to domain users via Slack account ID

#### Rate Limiting
- **Purpose:** Protect API endpoints from abuse
- **Technology:** In-memory sliding-window rate limiter
- **Limits:**
  - `/auth/*`: 10 req/min (OAuth flows)
  - `/api/auth/*`: 20 req/min (session endpoints)
  - `/api/extension/*`: 30 req/min per extension token
  - `/api/*`: 100 req/min (general API)

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
- **Encryption:** AES-256-GCM for OAuth tokens at rest
- **Token hashing:** SHA-256 for extension tokens (one-way)

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
├── extension_token: text (SHA-256 hash)
├── is_sharing: boolean
├── last_source: text ('spotify' | 'youtube-music' | null)
├── last_track_id: text
├── last_track_name: text
├── last_artist_name: text
├── is_currently_playing: boolean
├── last_polled_at: timestamp
└── poll_error_count: integer

better-auth tables (managed by better-auth)
├── user: better-auth user records
├── session: better-auth sessions
└── account: linked OAuth accounts (Slack provider)
```

## API Design

### Endpoints

```
# OAuth
GET  /auth/slack              # Slack OAuth initiate/callback (app install)
GET  /auth/spotify            # Spotify OAuth callback
GET  /auth/spotify/start      # Initiate Spotify OAuth

# better-auth
*    /api/auth/*              # Session management (sign-in, sign-out, session)

# Slack
POST /slack/events            # Event subscriptions (URL verification, app_home_opened)
POST /slack/commands          # Slash command handler
POST /slack/interactions      # Interactive components (buttons)

# Frontend API (requires better-auth session)
GET  /api/user/status         # Get DashboardStatus (connections, now playing, source)
POST /api/user/sharing        # Toggle sharing on/off
POST /api/user/disconnect     # Disconnect Spotify
GET  /api/spotify/connect-url # Get Spotify OAuth URL

# Extension API (requires X-Extension-Token header)
POST /api/extension/now-playing  # Receive now-playing from browser extension
GET  /api/extension/status       # Check extension connection status
GET  /api/extension/version      # Get latest extension version info

# Pages
GET  /                        # Landing page
GET  /dashboard               # Dashboard (requires sign-in)
GET  /privacy                 # Privacy policy
GET  /support                 # Support page
```

### Authentication
- **Slack:** OAuth 2.0 with bot scopes (commands, chat:write, users:read) and user scopes (users.profile:write, users.profile:read)
- **Spotify:** OAuth 2.0 with user-read-playback-state, user-read-currently-playing
- **Dashboard:** better-auth sessions via Slack social sign-in
- **Extension:** SHA-256 hashed tokens validated per-request

## Data Flow

### Spotify Flow
1. User installs Slack app → Bot token + User token stored (encrypted)
2. User signs in to dashboard (better-auth Slack social sign-in) or uses `/vibes connect`
3. User connects Spotify via dashboard or App Home → Spotify tokens stored (encrypted)
4. Polling service checks Spotify playback for users with `is_sharing=true` and `spotifyAccessToken`
5. On track change → Update Slack status with track name and artist
6. When playback stops → Clear Slack status

### YouTube Music Flow
1. User generates extension token via `/vibes token` in Slack → SHA-256 hash stored in DB
2. User installs browser extension (Chrome or Firefox) and enters token
3. Extension content script monitors YouTube Music DOM for track/play-state changes
4. Extension sends updates to `POST /api/extension/now-playing`
5. Server validates hashed token, validates input, updates Slack status

### Source Priority
When both Spotify and YouTube Music are active, the most recently used source wins. The Spotify poller defers for 30 seconds after a YouTube Music extension update, preventing status flickering.

## Security Architecture

- **Authentication:** OAuth 2.0 for Slack and Spotify; better-auth sessions for dashboard
- **Token storage:** AES-256-GCM encryption at rest for OAuth tokens
- **Extension tokens:** SHA-256 hashed before storage (never stored raw)
- **CSRF protection:** HMAC-signed state tokens with TTL for all OAuth flows
- **Signature verification:** Slack requests verified with `crypto.timingSafeEqual`
- **Rate limiting:** In-memory sliding-window limiter on all API routes
- **Input validation:** Extension payloads validated for types and length limits
- **No credential storage:** Only OAuth tokens, never passwords
- **Scopes:** Minimal required scopes only

## Polling Strategy

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Batch interval | 5 seconds | Quick status updates |
| Batch size | 10 users | Stay within rate limits |
| Per-user minimum | 5 seconds | Balance freshness vs. limits |
| Max errors | 5 | Pause problematic users |
| YT Music grace period | 30 seconds | Defer to extension when active |

## Development Environment

- **Prerequisites:** Bun, Biome
- **Setup:** `bun install`
- **Run:** `bun run dev`
- **Build:** `bun run build`
- **Lint:** `bun run lint`
- **Format:** `bun run format`

### Environment Variables

```bash
APP_URL=https://www.vibesbeingtransmitted.com
PORT=3000
DATABASE_PATH=./vibes.db
ENCRYPTION_KEY=<32-byte-hex>
BETTER_AUTH_SECRET=<random-secret>

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
│   │   ├── Landing.tsx        # Marketing landing page
│   │   ├── Dashboard.tsx      # Auto-refreshing control center
│   │   ├── index.html         # Landing page shell
│   │   ├── dashboard.html     # Dashboard shell
│   │   ├── privacy.html       # Privacy policy
│   │   └── support.html       # Support page
│   └── auth.ts                # better-auth client
│
├── server/                    # Hono backend
│   ├── routes/
│   │   ├── auth.ts            # OAuth (Slack + Spotify)
│   │   ├── slack.ts           # Events, commands, interactions
│   │   ├── extension.ts       # Browser extension API
│   │   └── api.ts             # Dashboard API
│   ├── services/
│   │   ├── slack.ts           # Slack API wrapper
│   │   ├── spotify.ts         # Spotify API wrapper
│   │   ├── poller.ts          # Background polling
│   │   └── crypto.ts          # Encryption, HMAC signing, token hashing
│   ├── middleware/
│   │   ├── slack.ts           # Request signature verification
│   │   ├── session.ts         # better-auth session middleware
│   │   └── rateLimit.ts       # In-memory rate limiting
│   ├── auth.ts                # better-auth server config
│   ├── config.ts
│   └── index.ts
│
├── db/
│   ├── schema.ts              # Drizzle schema
│   └── index.ts               # Connection
│
└── shared/
    ├── types.ts               # UserStatus, DashboardStatus, etc.
    └── format.ts              # Status text formatting

extension/                     # Browser extension (WXT + React)
├── wxt.config.ts              # WXT configuration
├── entrypoints/
│   ├── background.ts          # Background service worker
│   ├── youtube-music.content.ts  # YouTube Music DOM scraper
│   └── popup/                 # Extension popup UI
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       └── style.css
└── utils/
    └── types.ts               # Shared types

infra/                         # Infrastructure scripts (hcloud CLI)
├── config.ts                  # Server/resource configuration
├── hcloud.ts                  # hcloud CLI wrapper
├── setup.ts                   # Create infrastructure
├── deploy.ts                  # Deploy application
├── ssh.ts                     # SSH into server
├── status.ts                  # Show status
├── logs.ts                    # View logs
└── destroy.ts                 # Tear down infrastructure
```
