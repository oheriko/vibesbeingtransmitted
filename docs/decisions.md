# Key Decisions

This is an index of major architectural and technical decisions. Full context for each decision is in the referenced git commit.

## Format
Each decision includes:
- **Date** - When the decision was made
- **Title** - Brief description
- **Commit** - Link to commit with full context (decision, rationale, consequences)
- **Status** - Active, Superseded, or Deprecated

## Decisions

### 2026-02-08: Source priority — most recently active wins
- **Commit:** `fc2dd92`
- **Status:** Active
- **Summary:** When both Spotify and YouTube Music are active, the Spotify poller defers for 30s after any YouTube Music extension update
- **Rationale:** Prevents Slack status flickering between sources; whoever the user interacted with most recently keeps priority

### 2026-02-06: Dashboard redesign with auto-refresh and connection management
- **Commit:** `369bfe3`
- **Status:** Active
- **Summary:** Full dashboard rewrite with Now Playing hero card, connection cards for Spotify + YouTube Music, setup checklist, 10s auto-refresh
- **Rationale:** Users need a data-rich control center, not just a simple status page

### 2026-02-06: Security hardening — hashed tokens, rate limiting, input validation
- **Commit:** `e53dcd4`
- **Status:** Active
- **Summary:** Extension tokens SHA-256 hashed, HMAC-signed state for OAuth CSRF, crypto.timingSafeEqual for Slack signatures, in-memory rate limiting, input validation on extension endpoint
- **Rationale:** Defense in depth for production security

### 2026-02-06: Client-side auth flow after Slack install
- **Commit:** `6332e9f`
- **Status:** Active
- **Summary:** After Slack app install, redirect to dashboard which auto-triggers better-auth social sign-in client-side, instead of server-side redirect to better-auth endpoint
- **Rationale:** better-auth's /signin/social only accepts POST; server redirect is GET

### 2026-02-05: www subdomain as canonical
- **Commit:** `0fb6a11`
- **Status:** Active
- **Summary:** Use www.vibesbeingtransmitted.com as canonical URL; apex redirects to www via Cloudflare
- **Rationale:** www allows CNAME flexibility for CDNs; apex requires A records only

### 2026-02-05: Security-hardened server infrastructure
- **Commit:** `791f7c1`
- **Status:** Active
- **Summary:** Hetzner Cloud with non-root deploy user, SSH hardening, UFW firewall, fail2ban, unattended-upgrades
- **Rationale:** Production security best practices; defense in depth

### 2026-02-05: Scripts-only infrastructure management
- **Commit:** `b63e375`
- **Status:** Active
- **Summary:** All infrastructure operations must use `bun run infra:*` scripts; never run manual hcloud/ssh/scp commands
- **Rationale:** Ensures reproducibility, documentation, and prevents configuration drift

### 2026-02-04: Bun-only runtime
- **Commit:** (initial setup)
- **Status:** Active
- **Summary:** All runtime code must use Bun; no Node.js, npm, or non-Bun test runners

*Add new decisions above this line*

---

## How to Add a Decision

When making a significant decision:

1. **Capture it in your commit message:**
   ```
   feat: implement new feature

   Decision: [What was decided]

   Context: [Why we made this decision]
   - Point 1
   - Point 2

   Consequences:
   - Trade-off 1
   - Trade-off 2
   ```

2. **Add an entry to this file:**
   - Use the commit date
   - Link to the commit
   - Keep the summary brief

3. **Update related docs** if the decision changes:
   - architecture.md
   - constraints.md
   - requirements.md

## What Warrants a Decision Entry?

Add decisions that:
- Change system architecture
- Choose between technical alternatives
- Affect multiple components
- Have long-term impact
- Future developers will wonder "why did we do it this way?"

Don't add:
- Minor implementation details
- Standard practices
- Obvious choices
- Temporary workarounds
