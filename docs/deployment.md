# Deployment Guide

## Infrastructure Overview

- **Hosting:** Hetzner Cloud (Germany)
- **Server:** cx22 (2 vCPU, 4GB RAM, 40GB SSD)
- **OS:** Ubuntu 24.04
- **Runtime:** Bun
- **Reverse Proxy:** Caddy (automatic HTTPS)
- **Database:** SQLite (local file)

## Prerequisites

### 1. Install hcloud CLI

```bash
# macOS/Linux
brew install hcloud

# Or download from https://github.com/hetznercloud/cli/releases
```

### 2. Create Hetzner API Token

1. Go to https://console.hetzner.cloud
2. Select your project (or create one)
3. Go to Security → API Tokens
4. Generate a new token with Read & Write permissions

### 3. Configure hcloud

```bash
hcloud context create vibes
# Paste your API token when prompted
```

## Infrastructure Commands

All infrastructure is managed via bun scripts using the hcloud CLI:

| Command | Description |
|---------|-------------|
| `bun run infra:setup` | Create SSH key, firewall, and server |
| `bun run infra:deploy` | Deploy app to server |
| `bun run infra:ssh` | SSH into the server |
| `bun run infra:status` | Show infrastructure status |
| `bun run infra:logs` | View service logs (add `-f` to follow) |
| `bun run infra:destroy` | Tear down all resources |

## Initial Setup

### 1. Create Infrastructure

```bash
bun run infra:setup
```

This creates:
- **SSH Key:** `~/.ssh/vibes_deploy` (uploaded to Hetzner)
- **Firewall:** Allows SSH (22), HTTP (80), HTTPS (443)
- **Server:** Ubuntu 24.04 with cloud-init that installs:
  - Bun runtime
  - Caddy web server (auto-HTTPS)
  - Systemd service for the app

Wait ~2 minutes for cloud-init to complete.

### 2. Configure Environment

SSH into the server and create the environment file:

```bash
bun run infra:ssh

# On the server:
cat > /opt/vibes/.env << 'EOF'
NODE_ENV=production
PORT=3000
APP_URL=https://vibesbeingtransmitted.com
DATABASE_PATH=/opt/vibes/vibes.db
ENCRYPTION_KEY=<generate-32-byte-hex>

SLACK_CLIENT_ID=<your-slack-client-id>
SLACK_CLIENT_SECRET=<your-slack-client-secret>
SLACK_SIGNING_SECRET=<your-slack-signing-secret>

SPOTIFY_CLIENT_ID=<your-spotify-client-id>
SPOTIFY_CLIENT_SECRET=<your-spotify-client-secret>
EOF
```

Generate encryption key: `openssl rand -hex 32`

### 3. Deploy Application

```bash
bun run infra:deploy
```

This:
1. Builds the client locally
2. Syncs files via rsync (excludes node_modules, .env, etc.)
3. Installs production dependencies
4. Restarts the systemd service

### 4. Verify

- Visit https://vibesbeingtransmitted.com
- Check logs: `bun run infra:logs -f`

## Server Details

### File Locations

| Path | Description |
|------|-------------|
| `/opt/vibes` | Application root |
| `/opt/vibes/.env` | Environment variables |
| `/opt/vibes/vibes.db` | SQLite database |
| `/etc/caddy/Caddyfile` | Caddy configuration |
| `/etc/systemd/system/vibes.service` | Systemd service |

### Caddy Configuration

Caddy automatically provisions and renews SSL certificates via Let's Encrypt.

Default Caddyfile:
```
vibesbeingtransmitted.com {
    reverse_proxy localhost:3000
}
```

### Service Management

```bash
# On the server (via bun run infra:ssh)
systemctl status vibes    # Check status
systemctl restart vibes   # Restart app
systemctl stop vibes      # Stop app
journalctl -fu vibes      # Follow logs
```

## Updating the Application

```bash
# From your local machine
bun run infra:deploy
```

## DNS Configuration

Point your domain to the server IP:

```
A    vibesbeingtransmitted.com    <server-ipv4>
AAAA vibesbeingtransmitted.com    <server-ipv6>
```

Get the IP: `bun run infra:status`

## Destroying Infrastructure

```bash
bun run infra:destroy
```

This removes the server and firewall. SSH key is kept by default for reuse.

## Local Development

### Prerequisites
- Bun (latest version)
- Slack app credentials
- Spotify app credentials

### Setup
```bash
bun install
cp .env.example .env
# Fill in OAuth credentials in .env
bun run dev
```

### Tunnel for OAuth Testing

Slack and Spotify OAuth require HTTPS callbacks. Use cloudflared:

```bash
cloudflared tunnel --url http://localhost:3000
```

Update your Slack/Spotify app settings with the tunnel URL.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port (default: 3000) | No |
| `APP_URL` | Public URL of the app | Yes |
| `DATABASE_PATH` | Path to SQLite database | No |
| `ENCRYPTION_KEY` | 32-byte hex key for token encryption | Yes |
| `SLACK_CLIENT_ID` | Slack app client ID | Yes |
| `SLACK_CLIENT_SECRET` | Slack app client secret | Yes |
| `SLACK_SIGNING_SECRET` | Slack request signing secret | Yes |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID | Yes |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret | Yes |
| `SPOTIFY_REDIRECT_URI` | Override Spotify redirect (for local dev) | No |
