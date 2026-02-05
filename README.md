# Vibes Being Transmitted

**[vibesbeingtransmitted.com](https://www.vibesbeingtransmitted.com)**

A Slack app that shares what you're listening to on Spotify or YouTube Music with your teammates via your Slack status.

## Features

- Automatic Slack status updates when playing music
- **Spotify** - native integration, polls every 5 seconds
- **YouTube Music** - via browser extension
- `/vibes` slash command for quick controls
- App Home tab with connection status and controls
- Privacy-first - only current track is shared, nothing stored

## Install

1. Visit [vibesbeingtransmitted.com](https://www.vibesbeingtransmitted.com)
2. Click "Add to Slack"
3. Connect Spotify and/or install the YouTube Music extension

## Browser Extension

For YouTube Music support, install the browser extension:

- **Chrome/Edge**: Download from the site, unzip, load unpacked at `chrome://extensions`
- **Firefox**: Download from the site, load temporary add-on at `about:debugging`

Get your extension token via `/vibes token` in Slack.

## Development

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Run development server
bun run dev
```

### Environment Variables

```
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
ENCRYPTION_KEY=  # openssl rand -hex 32
```

### Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build frontend for production |
| `bun run start` | Start production server |
| `bun run build:extension` | Build browser extensions |
| `bun run infra:deploy` | Deploy to production |

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono
- **Frontend**: React
- **Database**: SQLite + Drizzle ORM
- **Extension**: WXT framework
- **Hosting**: Hetzner Cloud

## Documentation

- [docs/architecture.md](docs/architecture.md) - Technical design
- [docs/requirements.md](docs/requirements.md) - Business requirements
- [docs/llm.md](docs/llm.md) - Guide for AI coding assistants

## License

MIT
