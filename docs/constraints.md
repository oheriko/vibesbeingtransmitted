# Constraints

## Technical Constraints

### Performance
- Slack status updates should reflect track changes within a few seconds
- OAuth flows must complete without timeout

### Compatibility
- Must work with Slack desktop, web, and mobile clients
- Spotify links must work on all platforms

### Infrastructure
- **Hosting:** Hetzner Cloud (Germany, fsn1 region)
- **Server:** cx22 (2 vCPU, 4GB RAM, 40GB SSD)
- **OS:** Ubuntu 24.04 with security hardening
- **Domain:** www.vibesbeingtransmitted.com (www canonical, apex redirects via Cloudflare)
- **SSL:** Automatic via Caddy + Let's Encrypt
- **All infrastructure operations must use `bun run infra:*` scripts - never manual commands**

## Business Constraints

### Regulatory & Compliance
- Must comply with Spotify API Terms of Service
- Must comply with Slack App Directory guidelines
- User data (tokens) must be stored securely

### Budget
- [TBD]

### Timeline
- [TBD]

## Technology Constraints

### Approved Technologies
- **Runtime:** Bun only
- **Language:** TypeScript
- **Package manager:** Bun only
- **Test runner:** Bun test only
- **Linting/Formatting:** Biome
- **Commits:** Conventional Commits format required
- **Rationale:** Bun-first development for performance and simplicity; conventional commits for clear history and automated changelogs

### Prohibited Technologies
- **Node.js runtime:** All runtime code must use Bun APIs, not Node.js
- **npm/yarn/pnpm:** Bun is the only package manager
- **Jest/Vitest/Mocha:** Bun's built-in test runner only
- **Rationale:** Maintain a pure Bun stack for consistency and to leverage Bun's performance

### Dependencies
- Libraries must be Bun-compatible
- Prefer libraries with native Bun support over Node.js polyfills

## Security Constraints

### Authentication
- OAuth 2.0 only (Slack and Spotify)
- No password storage
- Token refresh must be handled gracefully

### Data Protection
- Encryption at rest: Required for OAuth tokens
- Encryption in transit: TLS required
- Minimal data retention: Only store what's needed for functionality

### Access Control
- Users control their own sharing (opt-in)
- No admin access to user playback data

## Operational Constraints

### Availability
- Single server deployment (no HA)
- Systemd manages process restarts
- Unattended security updates enabled

### Monitoring
- Systemd journal for logs (`bun run infra:logs`)
- Manual monitoring via `bun run infra:status`

## Integration Constraints

### APIs
- **Slack API:** Rate limits apply per workspace
- **Spotify API:** Rate limits apply; requires registered app
- Must handle API errors gracefully (token expiry, rate limits, service outages)

## Known Limitations

- **Spotify polling:** No webhooks available; must poll for playback state
- **Slack status length:** Limited character count for status text
- **Slack status emoji:** Must be standard or pre-existing custom emoji; cannot dynamically set album art as emoji
- **Premium vs Free:** Some Spotify features may differ by account type

## Trade-offs Accepted

- **Polling over push:** Spotify doesn't offer playback webhooks, so we accept polling delay
- **Bun-only:** May limit library choices, but gains performance and simplicity
