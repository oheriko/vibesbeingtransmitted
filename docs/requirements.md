# Requirements

## Project Overview

Vibes Being Transmitted is a Slack app that lets teammates see what each other are listening to on Spotify and YouTube Music. It brings music discovery and social connection to the workplace by surfacing listening activity in a non-intrusive way.

## Business Goals

- Enable organic music sharing between teammates
- Create moments of connection through shared musical taste
- Make it easy to discover new music from people you work with

## Target Users

- **Music listeners:** Anyone who listens to music while working and wants to share what they're into
- **Music discoverers:** Teammates curious about what others are listening to

## Functional Requirements

### Core Features

1. **Spotify Status in Slack**
   - Description: Show the currently playing track/artist in the user's Slack status
   - User story: As a user, I want my Slack status to show what I'm listening to so my teammates can see my music taste
   - Acceptance criteria:
     - [x] Status updates automatically when track changes
     - [x] Shows artist and track name
     - [x] Clears when playback stops

2. **YouTube Music Status in Slack**
   - Description: Show YouTube Music playback in Slack status via browser extension
   - User story: As a YouTube Music user, I want my Slack status to reflect what I'm listening to
   - Acceptance criteria:
     - [x] Browser extension scrapes YouTube Music DOM
     - [x] Extension sends now-playing updates to server
     - [x] Available for Chrome and Firefox
     - [x] When both sources are active, the most recently used source wins (30s grace period)

3. **Web Dashboard**
   - Description: Auto-refreshing control center for managing connections and viewing now-playing
   - User story: As a user, I want a dashboard to see my current status and manage Spotify/extension connections
   - Acceptance criteria:
     - [x] Now Playing hero card with live source indicator and pulse animation
     - [x] Spotify and YouTube Music connection management cards
     - [x] Setup checklist for onboarding
     - [x] Auto-refreshes every 10s with live "Updated Xs ago" ticker
     - [x] Sharing toggle (pause/resume)

4. **Open in Spotify**
   - Description: Teammates can click to open the album/playlist/radio in their own Spotify
   - User story: As a teammate, I want to click on someone's status to open that music in Spotify so I can listen too
   - Acceptance criteria:
     - [ ] Clickable link in status or profile
     - [ ] Opens correct content in Spotify (album, playlist, or track)
     - [ ] Works on desktop and mobile

## Non-Functional Requirements

### Performance
- Status updates should reflect track changes within a few seconds
- Spotify link generation should be instant

### Security
- OAuth 2.0 for both Slack and Spotify authentication
- Session management via better-auth (Slack social sign-in)
- No storage of user credentials - token-based auth only
- Extension tokens stored as SHA-256 hashes (never raw)
- HMAC-signed state tokens for OAuth CSRF protection
- Rate limiting on all API endpoints
- Users must explicitly opt-in to share their listening activity

### Usability
- Zero configuration after initial OAuth setup
- Works in any Slack workspace

## Success Metrics
- [TODO: Define success metrics]

## Out of Scope
- Music playback controls from within Slack
- Listening history or statistics
- Recommendations engine

## Dependencies

- **Slack API:** For status updates and workspace integration
- **Spotify Web API:** For reading current playback state
- **better-auth:** Session management and Slack social sign-in for the web dashboard

## Assumptions

- Users have Spotify and/or YouTube Music accounts
- Users are in a Slack workspace where the app is installed
- Spotify is actively playing (not paused) for status to show, or YouTube Music extension is active

## Open Questions

- [ ] How to handle users who want to hide certain tracks/artists?
- [ ] Should there be a "do not disturb" mode?
- [ ] What happens when multiple devices are playing?
