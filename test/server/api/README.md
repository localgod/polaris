# API Handler Tests

This directory contains handler-level tests for `server/api/**` route handlers. For general testing principles, scripts, and the full layer overview see [`test/README.md`](../../README.md).

## Approach

Each route handler is called directly with a mocked H3 event. Tests do not spin up an HTTP server — they exercise the actual handler function, which means auth guards, query parameter validation, path parameter extraction, error propagation, and response shaping are all covered.

This is distinct from the service-layer tests in `test/server/services/`, which mock the repository layer and test business logic in isolation.

## Infrastructure

### `test/fixtures/h3-event.ts` — `mockEvent()`

Creates a real H3 event with injected query params, path params, and body:

```ts
import { mockEvent } from '../../fixtures/h3-event'

// GET with query params
mockEvent({ query: { limit: '10', offset: '0' } })

// POST with body
mockEvent({ method: 'POST', body: { name: 'React', type: 'library' } })

// DELETE with path params
mockEvent({ method: 'DELETE', params: { userId: 'u-1', tokenId: 'tok-1' } })
```

Body injection uses the `h3ParsedBody` symbol so `readBody()` returns it immediately without needing a real HTTP stream.

### `test/setup/h3-globals.ts` — Nuxt auto-import stubs

Nuxt injects h3 functions (`defineEventHandler`, `getQuery`, `readBody`, `getRouterParam`, etc.) and `server/utils/auth` exports as globals at build time. In Vitest these are wired via `setupFiles`.

Auth functions (`requireAuth`, `requireSuperuser`, etc.) are registered as stubs that throw by default. Individual tests override them with `vi.stubGlobal()` + `vi.hoisted()`:

```ts
const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn()
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
})
```

`vi.hoisted` ensures the fn exists before module evaluation. `vi.stubGlobal` replaces the global directly — `vi.mock('../../../server/utils/auth')` does not work here because handlers reference auth functions as globals, not module imports.

## Test format

Tests use [vitest-cucumber](https://github.com/amiceli/vitest-cucumber) with `.feature` files. Each `.feature` file describes the observable behaviour of one or more route handlers; the corresponding `.spec.ts` file wires the Gherkin steps to actual handler calls.

```
systems.feature        ← Gherkin scenarios
systems.spec.ts        ← step implementations calling getHandler / postHandler
```

### Example

```ts
Scenario('Non-integer limit is rejected', ({ When, Then, And }) => {
  When('I request GET "/api/systems" with limit "abc"', async () => {
    getResult = await getHandler(mockEvent({ query: { limit: 'abc' } }))
  })
  Then('the response should be unsuccessful', () => {
    expect(getResult.success).toBe(false)
  })
  And('the response error should mention integers', () => {
    expect(getResult.error).toMatch(/integer/)
  })
})
```

## What is covered

| Concern | Covered |
|---|---|
| Auth guard execution (401/403) | ✅ |
| Query param parsing and validation | ✅ |
| Pagination clamping `[1, 200]` | ✅ |
| Path param extraction | ✅ |
| Service delegation (correct args) | ✅ |
| Error re-throwing (`createError` 409 etc.) | ✅ |
| Unexpected error wrapping (500) | ✅ |
| Response shape (`success`, `data`, `total`) | ✅ |
| Nitro routing (URL → handler mapping) | ❌ requires HTTP server |
| H3 middleware execution order | ❌ requires HTTP server |

## Adding tests for a new handler

1. Create `<handler-name>.feature` with Gherkin scenarios describing the observable behaviour
2. Create `<handler-name>.spec.ts` importing the handler and wiring steps via `mockEvent()`
3. Mock singletons with `vi.mock('../../../server/services/singletons', ...)`
4. Stub auth globals with `vi.hoisted` + `vi.stubGlobal` in `beforeAll`
