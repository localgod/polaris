# Agent Instructions for Polaris Project

This document provides context and instructions for AI agents working on this project:
commands, architecture, testing conventions and the change workflow. Tool-specific
guidance (e.g. Claude Code's MCP servers and subagents) lives in [CLAUDE.md](CLAUDE.md).

## Commands

```bash
npm run dev               # Start Nuxt dev server (http://localhost:3000)
npm run build             # Generates OpenAPI docs, then builds Nuxt + copies runtime assets
npm run lint              # ESLint (Nuxt-configured)
npm run lint:fix          # ESLint with auto-fix
npm run typecheck         # nuxt typecheck (vue-tsc) — not yet clean, non-blocking in CI

# Tests — run a specific layer to stay fast
npm run test              # All unit tests (excludes integration)
npm run test:server:api   # API handler tests (no DB, ~10ms each)
npm run test:server:services  # Service layer tests (no DB)
npm run test:server:repositories  # Repository tests (requires live Neo4j)
npm run test:app          # Frontend component/composable/e2e tests
npm run test:integration  # Full HTTP integration tests (starts real Nitro server)

# Run a single test file
npx vitest run test/server/api/components.spec.ts

# Database
npm run migrate:up        # Apply pending migrations
npm run migrate:down      # Roll back last migration
npm run migrate:create    # Scaffold a new migration file
npm run migrate:status    # Show applied/pending migrations
npm run seed              # Seed development data

# Talk to the running dev server (Nuxt CLI v4)
npx nuxt task list                        # List the Nitro tasks the server exposes
npx nuxt task run health-refresh:process  # Run a task now instead of waiting for its schedule
npx nuxt curl /api/teams              # Call an API route on the running server
npx nuxt docs "useFetch"              # Search the docs for the installed Nuxt version
```

Neo4j runs locally on `bolt://localhost:7687`, credentials `neo4j / devpassword`. The Neo4j Browser is at `http://localhost:7474`. The devcontainer uses `network_mode: host` so `localhost` resolves correctly inside the container.

## Architecture

### 3-Layer API Pattern

All server endpoints follow a strict three-layer separation:

```
server/api/          → HTTP: request parsing, validation, auth guards, response shaping
server/services/     → Business logic, orchestration, rule enforcement
server/repositories/ → Cypher query execution, Neo4j record mapping
server/database/queries/<domain>/<verb>.cypher  → Query files loaded at runtime
```

Endpoints import service singletons from `server/services/singletons.ts` (all services are stateless and shared per-process). Repositories extend `BaseRepository`, which injects `useDriver()` in production or accepts a `Driver` constructor arg in tests.

Cypher queries live in `.cypher` files, loaded with `loadQuery('technologies/find-all.cypher')` from `server/utils/query-loader.ts`. Dynamic ORDER BY and WHERE clauses use `{{ORDER_BY}}` / `{{WHERE_CONDITIONS}}` placeholders injected via `injectOrderBy()` / `injectWhereConditions()`.

### Response Conventions

Use the shared helpers from `server/utils/response.ts`:
- `sendSuccess(event, data)` — 200 with `{ success: true, data, count }`
- `sendCreated(event, data)` — 201
- `sendNoContentResponse(event)` — 204
- `sendNotFound(resource, id)`, `sendBadRequest(msg)`, `sendConflict(msg)` — throw H3 errors

### Auth

Auth helpers (`requireAuth`, `requireSuperuser`, `requireRole`) are Nuxt auto-import globals in handlers — do not import them. Auth supports GitHub OAuth (`@sidebase/nuxt-auth`) and Bearer token (for API access). Impersonation is available via cookie.

### Frontend

Pages live in `app/pages/`, components in `app/components/`. Uses `@nuxt/ui` (Tailwind-based). Composables in `app/composables/` — `useApiData` / `useApiCount` are the standard wrappers for `useFetch` responses. Shared API types are in `types/api.d.ts` (consumed by both server and client).

Nitro scheduled tasks run at fixed intervals (see `nuxt.config.ts`): `health-refresh:process` every 5 min, `health-refresh:enqueue-scheduled` every 12h.

### Graph Data Model

Key node labels: `Technology`, `Component`, `System`, `Team`, `VersionConstraint`, `AuditLog`, `ImportJob`, `HealthSnapshot`

A `Technology` can never exist without at least one linked `Component` (an SBOM-observed dependency) — it can only be created by claiming an existing, unlinked `Component` via `POST /api/technologies` or the `/admin/component-links` queue. See `docs/architecture/decisions/0004-technology-requires-component.md`. (ADR-0004 originally introduced a `Platform` node as a superuser-only exception for non-SBOM-observable infrastructure; it was removed per `docs/architecture/decisions/0007-remove-platform-concept.md` — Polaris now governs only what SBOM evidence shows.)

Key relationships: `STEWARDED_BY` (Team→Technology, technical governance), `OWNS` (Team→System, operational ownership), `APPROVES` (Team→Technology, carries TIME framework attributes), `IS_VERSION_OF` (Component→Technology), `USES` (System→Component, carries `isDirect`), `DEPENDS_ON` (Component→Component), `GOVERNS` (VersionConstraint→Technology)

Neo4j Community Edition is in use — there is no separate test database. Tests isolate data with a `test_` / `test-` name prefix; the global setup cleans these nodes before and after the suite.

### Testing Strategy

| Layer | Location | Mocks | DB |
|-------|----------|-------|----|
| API handlers | `test/server/api/` | Mocks service singletons | No |
| Services | `test/server/services/` | Mocks repositories | No |
| Repositories | `test/server/repositories/` | None | Yes |
| Integration | `test/integration/` | None (real Nitro server) | Yes |
| Frontend | `test/app/` | Vitest + happy-dom | No |

API tests call handler functions directly via `mockEvent()` from
`test/fixtures/h3-event.ts`. Auth globals are stubbed with `vi.stubGlobal()`
— see `test/setup/h3-globals.ts` for the wiring pattern.

### Test intent classification

Every test is one of two kinds. Mark the distinction with a describe-block
prefix:

- **`[contract]`** — encodes a requirement someone actually decided on
  (invariants, business rules, API response shapes consumers depend on).
  These are constraints. Do not weaken, delete, or rewrite a `[contract]`
  test to make a change pass. If a requested change genuinely conflicts
  with one, stop and surface the conflict instead of resolving it yourself.
- **`[pin]`** — characterization tests that snapshot current behavior
  nobody explicitly specified (default ordering, incidental formatting,
  exact wording of messages). These are disposable: update or regenerate
  them freely when behavior changes intentionally.

Untagged tests are treated as `[pin]`. When writing new tests, only tag
`[contract]` if the assertion traces to a stated requirement in this file,
a spec, or an explicit user instruction — not to behavior you just
implemented.

### What to assert

- Test observable behavior at the layer's public boundary (inputs →
  outputs, persisted state, HTTP status + body shape).
- Do not assert internal call sequences, call counts, or arguments passed
  to mocks unless that interaction *is* the contract (e.g. "must not call
  the payment provider twice"). Mocks exist to isolate layers, not to be
  asserted against.
- Avoid asserting exact error-message strings, incidental ordering, or
  full-object snapshots when only specific fields matter. Assert the
  fields that matter.

### When a change breaks existing tests

1. Classify the failure: regression (fix the code) or outdated spec
   (update the test).
2. For `[pin]` tests: update them to match the new intended behavior.
3. For `[contract]` tests: do not modify without flagging. Ask before
   changing.
4. In your summary, list every test file you modified or deleted and why,
   separately from tests you added — so test changes can be reviewed as
   spec changes, not noise.

### Coverage

Coverage is not a goal in itself. Do not add tests that restate the
implementation to raise coverage. A smaller suite of boundary-level
contract tests beats exhaustive mocks of internals.

## Database Migrations

Migration files go in `schema/migrations/common/` (all envs), `dev/`, or `prod/`. Naming: `YYYYMMDD_HHmmss_description.up.cypher` + matching `.down.cypher`. APOC is available.

## Branch Protection and Pull Request Workflow

**This repository enforces branch protection on the `main` branch.**

### What This Means

- Direct pushes to `main` are blocked
- All changes must go through Pull Requests
- CI checks (lint, tests, build) must pass before merging; the type-check job runs too but is non-blocking for now
- Code review may be required (depending on configuration)

### Workflow for Changes

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/descriptive-name
   ```

2. **Make changes and commit** (Conventional Commits, e.g. `fix(api): ...`, `chore(deps): ...`).
   A lefthook pre-commit hook lints the staged files:

   ```bash
   git add <files>
   git commit -m "type(scope): description"
   ```

3. **Push to the feature branch:**

   ```bash
   git push -u origin feature/descriptive-name
   ```

4. **Create a Pull Request** (fill in `.github/PULL_REQUEST_TEMPLATE.md`):

   ```bash
   gh pr create --title "type(scope): description" --body "..."
   ```

5. **Wait for CI checks and review**

6. **Merge the PR** (via GitHub UI or CLI)

## Important Notes for Agents

1. **NEVER commit or push changes unless explicitly asked to do so by the user.** This is critical - always wait for explicit permission before committing.

2. **This repository uses branch protection rules.** Direct pushes to the `main` branch are not allowed. All changes must go through Pull Requests. When asked to commit while on `main`, create a feature branch first.

3. The `ship-feature` skill (`.claude/skills/ship-feature/`) automates branch → checks → commit → PR. PRs are opened ready for review, never as drafts.

## Repository Information

- **Repository:** https://github.com/localgod/polaris
- **Live Site:** https://localgod.github.io/polaris/
- **Owner:** localgod
