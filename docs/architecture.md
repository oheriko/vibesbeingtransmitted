# Architecture

## Overview

Vibes Being Transmitted is a Slack app that bridges Spotify and Slack, polling users' current playback and updating their Slack status accordingly. It provides clickable links so teammates can open the same music in their own Spotify.

## System Design

### Architecture Pattern
- Pattern: Slack App (event-driven + polling)
- Rationale: Slack apps require specific interaction patterns; Spotify doesn't push playback events so polling is necessary

### Components

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Slack     │◀───▶│  Vibes Being    │◀───▶│   Spotify   │
│   API       │     │  Transmitted    │     │   Web API   │
└─────────────┘     └─────────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Storage   │
                    │    (TBD)    │
                    └─────────────┘
```

#### Slack Integration
- **Purpose:** Update user status, handle app installation, provide interactive elements
- **Technology:** Slack Bolt SDK (Bun-compatible)
- **Responsibilities:**
  - OAuth flow for workspace installation
  - Status updates via Slack API
  - Interactive messages/buttons for Spotify links

#### Spotify Integration
- **Purpose:** Read current playback state for authenticated users
- **Technology:** Spotify Web API
- **Responsibilities:**
  - OAuth flow for user authorization
  - Poll current playback endpoint
  - Generate Spotify URIs/links for sharing

#### Polling Service
- **Purpose:** Periodically check Spotify playback and sync to Slack
- **Technology:** Bun
- **Responsibilities:**
  - Schedule playback checks for active users
  - Detect track changes
  - Trigger Slack status updates

## Technology Stack

### Runtime
- **Runtime:** Bun (exclusively - no Node.js)
- **Language:** TypeScript
- **Linting/Formatting:** Biome

### Backend
- **Framework:** [TBD - likely Hono or Elysia for Bun]
- **API style:** REST (for Slack/Spotify webhooks and OAuth)

### Database
- **Primary database:** [TBD]
- **What to store:** OAuth tokens, user preferences, opt-in status

### Infrastructure
- **Hosting:** [TBD]
- **CI/CD:** [TBD]

## Data Model

### Key Entities

```
User
├── id: string (Slack user ID)
├── slack_team_id: string
├── spotify_tokens: SpotifyTokens (encrypted)
├── is_sharing: boolean
└── created_at: timestamp

SpotifyTokens
├── access_token: string
├── refresh_token: string
└── expires_at: timestamp
```

### Relationships
- User belongs to a Slack workspace (team)
- User has Spotify OAuth tokens

## API Design

### Endpoints

```
GET  /slack/oauth          # Slack OAuth callback
GET  /spotify/oauth        # Spotify OAuth callback
POST /slack/events         # Slack event subscriptions
POST /slack/interactions   # Slack interactive components
```

### Authentication
- **Slack:** OAuth 2.0 with bot and user scopes
- **Spotify:** OAuth 2.0 with user-read-playback-state scope

## Data Flow

1. User installs Slack app → Slack OAuth tokens stored
2. User connects Spotify → Spotify OAuth tokens stored
3. Polling service checks Spotify playback for active users
4. On track change → Update Slack status via API
5. Teammate clicks status → Opens Spotify link

## Security Architecture

- **Authentication:** OAuth 2.0 for both Slack and Spotify
- **Token storage:** Encrypted at rest
- **No credential storage:** Only OAuth tokens, never passwords
- **Scopes:** Minimal required scopes only

## Third-Party Integrations

- **Slack API:** Status updates, app installation, interactive messages
- **Spotify Web API:** Current playback state, track/album/playlist metadata

## Development Environment

- **Prerequisites:** Bun (latest)
- **Setup:** `bun install`
- **Run:** `bun run dev`
- **Test:** `bun test`
- **Configuration:** Environment variables for OAuth client IDs/secrets
