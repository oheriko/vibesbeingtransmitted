# Vibes Being Transmitted

A Slack app that shares what you're listening to on Spotify with your teammates via your Slack status.

## Features

- Automatic Slack status updates when playing music on Spotify
- `/vibes` slash command for quick controls
- App Home tab with connection status and toggle
- Privacy controls - pause/resume sharing anytime

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Run development server
bun run dev
```

## Setup

### 1. Create Slack App

Use the included manifest to create your Slack app:

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From a manifest"
3. Select your workspace
4. Paste contents of `slack-app-manifest.yaml`
5. Create and install the app
6. Copy credentials to `.env`:
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `SLACK_SIGNING_SECRET`

### 2. Create Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Create an app
3. Add redirect URI: `https://www.vibesbeingtransmitted.com/auth/spotify`
4. Copy credentials to `.env`:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`

### 3. Generate Encryption Key

```bash
openssl rand -hex 32
```

Add to `.env` as `ENCRYPTION_KEY`.

### 4. Local Development

For local dev, you need a tunnel for Slack while Spotify can use localhost:

```bash
# Terminal 1: Start server
bun run dev

# Terminal 2: Start tunnel
cloudflared tunnel --url http://localhost:3000
```

Update your Slack app URLs to the tunnel URL, and add to `.env`:
```
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/auth/spotify
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build frontend for production |
| `bun run start` | Start production server |
| `bun run lint` | Run Biome linter |
| `bun run format` | Format code with Biome |

## Documentation

- **[docs/architecture.md](docs/architecture.md)** - Technical design and system architecture
- **[docs/requirements.md](docs/requirements.md)** - Business requirements
- **[docs/constraints.md](docs/constraints.md)** - Technical constraints
- **[docs/llm.md](docs/llm.md)** - Guide for AI coding assistants

## License

MIT
