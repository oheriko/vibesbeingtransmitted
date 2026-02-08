# Testing Guidelines

## Philosophy

- Test behavior, not implementation details
- Focus on integration points (Slack API, Spotify API)
- Mock external services in tests

## Test Structure

### Directory Layout
```
src/
  server/
    services/
      crypto.ts
      crypto.test.ts          # Co-located unit tests
    routes/
      extension.ts
      extension.test.ts       # Co-located route tests
    middleware/
      rateLimit.ts
      rateLimit.test.ts       # Co-located middleware tests
  shared/
    format.ts
    format.test.ts            # Co-located shared tests
```

### Naming Conventions
- Test files: `*.test.ts` (co-located with source)
- Test descriptions: `test('does something when condition', ...)`

## Running Tests

### Commands
```bash
bun test                    # All tests
bun test --watch            # Watch mode
bun test src/lib/           # Tests in specific directory
bun test --coverage         # With coverage report
```

**Important:** Only use `bun test` - no npm, no other test runners.

### CI/CD
- Manual deployment via `bun run infra:deploy`
- No automated CI/CD pipeline yet

## Coverage Requirements

### Targets
- [TBD]

### Exclusions
- Type definitions
- Configuration files

## Writing Tests

### Unit Tests

**What to test:**
- Utility functions (formatting track info, building Spotify URLs)
- Token refresh logic
- Status text generation

**Example:**
```typescript
import { test, expect } from "bun:test";
import { formatStatusText } from "./format";

test("formats track and artist into status text", () => {
  const result = formatStatusText({
    track: "Bohemian Rhapsody",
    artist: "Queen",
  });
  expect(result).toBe("🎵 Bohemian Rhapsody - Queen");
});

test("truncates long status text", () => {
  const result = formatStatusText({
    track: "A Very Long Track Name That Exceeds The Limit",
    artist: "An Artist With A Very Long Name",
  });
  expect(result.length).toBeLessThanOrEqual(100);
});
```

### Integration Tests

**What to test:**
- OAuth callback handlers
- Slack event webhook handlers
- API route responses

**Example:**
```typescript
import { test, expect } from "bun:test";

test("slack events endpoint validates signature", async () => {
  const response = await fetch("http://localhost:3000/slack/events", {
    method: "POST",
    body: JSON.stringify({ type: "url_verification" }),
  });
  expect(response.status).toBe(401); // Invalid signature
});
```

### E2E Tests

For a Slack app, E2E testing is challenging. Focus on:
- OAuth flow completion (manual testing)
- Webhook handling (integration tests with mocked payloads)

## Mocking Strategy

### When to Mock
- **Slack API:** Always mock in tests
- **Spotify API:** Always mock in tests
- **Time/dates:** Mock when testing token expiry logic

### How to Mock
Bun has built-in mocking with `bun:test`:

```typescript
import { test, expect, mock } from "bun:test";

const mockFetch = mock(() =>
  Promise.resolve(new Response(JSON.stringify({ item: { name: "Track" } })))
);

test("fetches current track", async () => {
  globalThis.fetch = mockFetch;
  // ... test code
  expect(mockFetch).toHaveBeenCalled();
});
```

## Test Data

### Fixtures
- Location: `tests/fixtures/` or inline in test files
- Format: TypeScript objects

### Factories
```typescript
function createSpotifyTrack(overrides = {}) {
  return {
    name: "Test Track",
    artists: [{ name: "Test Artist" }],
    album: { name: "Test Album" },
    external_urls: { spotify: "https://open.spotify.com/track/123" },
    ...overrides,
  };
}
```

## Common Patterns

### Async Testing
```typescript
import { test, expect } from "bun:test";

test("refreshes expired token", async () => {
  const newToken = await refreshToken(expiredToken);
  expect(newToken.expires_at).toBeGreaterThan(Date.now());
});
```

### Error Testing
```typescript
import { test, expect } from "bun:test";

test("throws on invalid token", () => {
  expect(() => validateToken(null)).toThrow();
});
```

## Debugging Tests

```bash
bun test --timeout 30000     # Longer timeout for debugging
bun test path/to/file.test.ts  # Run specific test file
```

## Best Practices

### Do's
- Write descriptive test names
- Test behavior, not implementation
- Keep tests independent
- Mock external APIs (Slack, Spotify)
- Use `bun:test` imports

### Don'ts
- Don't use Jest, Vitest, or other test runners
- Don't share state between tests
- Don't make real API calls in tests
- Don't test third-party library internals

## For LLMs

When generating tests:
- **Always use `bun:test`** - import from "bun:test", not jest or vitest
- Use `test()` not `it()` (both work, but `test` is preferred)
- Mock Slack and Spotify API calls
- Include edge cases (expired tokens, rate limits, missing data)
- Keep tests focused and independent
