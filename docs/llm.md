# LLM Assistant Guide

> **Note:** This file may be symlinked as CLAUDE.md, AGENTS.md, .cursorrules, etc.
> for different AI coding tools. Edit `docs/llm.md` directly.

This document explains how to effectively use AI coding assistants with this repository.

## IMPORTANT: Native Dependencies Fix

**When building the browser extension or running commands that use native Node modules (sharp, lmdb, etc.), you MUST prefix with:**

```bash
LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libstdc++.so.6 bun run build
```

This is required on this NixOS system because native modules need the system's libstdc++.

## Documentation Structure

This repo uses documentation-as-context to help AI understand the project:

- **[requirements.md](requirements.md)** - Business requirements and project goals
- **[architecture.md](architecture.md)** - Technical architecture and system design
- **[constraints.md](constraints.md)** - Hard limitations (performance, compatibility, licensing, etc.)
- **[decisions.md](decisions.md)** - Index of key decisions (full context in git commits)
- **[testing.md](testing.md)** - Testing strategy and guidelines
- **[deployment.md](deployment.md)** - Deployment process and requirements

**Read these first** before making significant changes.

## Git Workflow

### IMPORTANT: Commit Rules

- **Always commit** when work is complete
- **NEVER push** - the user will push when ready

### Commits
We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve memory leak in cache
docs: update architecture decisions
feat!: breaking API change
```

**For decisions:** Include context directly in commit messages:
```
feat: migrate to postgres

Decision: Use PostgreSQL instead of MongoDB

Context: [why we're doing this]
Consequences: [tradeoffs and implications]
```

### Semantic Versioning
Suggest semver bumps based on commits:
- `feat!` or `BREAKING CHANGE` → MAJOR
- `feat` → MINOR
- `fix`, `perf` → PATCH
- `docs`, `style`, `refactor`, `test`, `chore` → no version bump

## Infrastructure Rules

### IMPORTANT: Scripts Only

- **Always use `bun run infra:*` scripts** for any infrastructure operations
- **NEVER run manual commands** (hcloud, ssh, scp) directly
- If a fix is needed, **update the script first**, then run it
- This ensures all operations are reproducible and documented

Available scripts:
- `bun run infra:setup` - Create infrastructure
- `bun run infra:deploy` - Deploy application
- `bun run infra:status` - Check status (includes DNS/HTTPS)
- `bun run infra:diagnose` - Debug issues
- `bun run infra:ssh` - Connect to server
- `bun run infra:destroy` - Tear down infrastructure

## Development Guidelines

### Before Making Changes
1. Read relevant docs (requirements, architecture, constraints)
2. Check ROADMAP.md for planned work
3. Review recent commits for context
4. Check docs/decisions.md for related decisions

### When Making Decisions
- Capture rationale in commit messages
- Add entry to docs/decisions.md if it's a major architectural choice
- Update relevant docs (architecture.md, constraints.md) if decision changes them

### Code Conventions

**Runtime & Package Manager:**
- Bun only - no Node.js runtime code
- `bun install` for dependencies
- `bun run` for scripts
- `bun test` for testing

**Language & Tooling:**
- TypeScript (strict mode)
- **Only use Bun and Biome** for TypeScript - no tsc, eslint, prettier, etc.
- `bun run lint` - check for errors (biome check)
- `bun run format` - fix formatting (biome format)

**Testing:**
- Use `bun:test` exclusively
- Co-locate tests with source files (`*.test.ts`)
- Mock external APIs (Slack, Spotify)

**Code Style:**
- Biome handles formatting (run `bun run format` or configure editor)
- Prefer explicit types over inference for function signatures
- Use async/await over raw Promises

## Asking for Help

**Good prompts:**
- "Review the requirements and suggest an approach for [feature]"
- "Does this change align with our architecture decisions?"
- "What version bump does this warrant?"
- "Check if this violates any constraints"

**Provide context:**
- Link to relevant docs: "See docs/constraints.md for performance requirements"
- Reference decisions: "This relates to the postgres migration decision"
- Point to roadmap: "This is part of the Q4 auth work"

## Keeping Documentation Fresh

Documentation lives with code and evolves with it:
- Update docs in the same commit as code changes
- If you find docs are wrong, fix them immediately
- Stale docs are worse than no docs
