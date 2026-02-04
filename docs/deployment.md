# Deployment Guide

> **Note:** Infrastructure decisions are TBD. This document will be updated once hosting is chosen.

## Environments

### Development
- **URL:** http://localhost:3000
- **Purpose:** Local development and testing
- **Run:** `bun run dev`

### Staging
- [TBD]

### Production
- [TBD]

## Local Development Setup

### Prerequisites
- Bun (latest version)
- Slack app credentials (for OAuth)
- Spotify app credentials (for OAuth)

### Setup
```bash
bun install
cp .env.example .env
# Fill in OAuth credentials in .env
bun run dev
```

### Required Environment Variables
- `SLACK_CLIENT_ID` - Slack app client ID
- `SLACK_CLIENT_SECRET` - Slack app client secret
- `SLACK_SIGNING_SECRET` - Slack request signing secret
- `SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret

## Infrastructure (TBD)

Once infrastructure is decided, this section will cover:
- Hosting platform
- CI/CD pipeline
- Database/storage
- Secrets management
- Monitoring and alerting

## For LLMs

When suggesting deployment changes:
- Remember infrastructure is TBD
- All commands should use `bun`, not `npm`
- OAuth credentials are required for the app to function
