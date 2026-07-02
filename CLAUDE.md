# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev               # Start Nuxt dev server (http://localhost:3000)
npm run build             # Generates OpenAPI docs, then builds Nuxt + copies runtime assets
npm run lint              # ESLint (Nuxt-configured)
npm run lint:fix          # ESLint with auto-fix

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

Key node labels: `Technology`, `Platform`, `Version`, `Component`, `System`, `Team`, `Policy`, `VersionConstraint`, `AuditLog`, `ImportJob`, `HealthSnapshot`

A `Technology` can never exist without at least one linked `Component` (an SBOM-observed dependency) — it can only be created by claiming an existing, unlinked `Component` via `POST /api/technologies` or the `/admin/component-links` queue. `Platform` is the deliberate, superuser-only exception for infrastructure/services SBOM scanning can never see (databases, cloud services, container runtimes) — it carries the same stewardship/TIME-approval shape but no Component requirement. See `docs/architecture/decisions/0004-technology-requires-component.md`.

Key relationships: `STEWARDED_BY` (Team→Technology/Platform, technical governance), `OWNS` (Team→System, operational ownership), `APPROVES` (Team→Technology/Platform, carries TIME framework attributes), `HAS_VERSION` (Technology→Version), `IS_VERSION_OF` (Component→Technology), `USES` (System→Component, carries `isDirect`), `DEPENDS_ON` (Component→Component), `GOVERNS` (VersionConstraint→Technology)

Neo4j Community Edition is in use — there is no separate test database. Tests isolate data with a `test_` / `test-` name prefix; the global setup cleans these nodes before and after the suite.

## Testing Strategy

| Layer | Location | Mocks | DB |
|-------|----------|-------|----|
| API handlers | `test/server/api/` | Mocks service singletons | No |
| Services | `test/server/services/` | Mocks repositories | No |
| Repositories | `test/server/repositories/` | None | Yes |
| Integration | `test/integration/` | None (real Nitro server) | Yes |
| Frontend | `test/app/` | Vitest + happy-dom | No |

API tests call handler functions directly via `mockEvent()` from `test/fixtures/h3-event.ts`. Auth globals are stubbed with `vi.stubGlobal()` — see `test/setup/h3-globals.ts` for the wiring pattern.

## Database Migrations

Migration files go in `schema/migrations/common/` (all envs), `dev/`, or `prod/`. Naming: `YYYYMMDD_HHmmss_description.up.cypher` + matching `.down.cypher`. APOC is available.

## Branch Workflow

`main` is protected — all changes go through PRs. Never push directly to `main`. See `AGENTS.md` for the full PR workflow.

## MCP Tools: local-model

A local Qwen 2.5 7B model runs via Docker Model Runner and is available as a set of tools. Prefer these over doing the task manually:

| Tool | Use instead of |
| ---- | -------------- |
| `run_tests` | `npm test` via Bash — returns a diagnosis, not raw output |
| `run_lint` | `npm run lint` via Bash — returns grouped issues |
| `draft_commit_message` | Writing commit messages manually — pass `git diff HEAD` |
| `create_pr_body` | Writing PR descriptions manually — pass `git diff main...HEAD` |
| `draft_cypher` | Writing Cypher queries from scratch — describe what you need in plain English |
| `review_snippet` | First-pass review before a deep dive — flags convention violations |
| `summarize_code` | Reading an unfamiliar file line-by-line — get a quick overview first |

The Neo4j MCP (`execute_query`) gives direct Cypher access to the live database — use it to explore data or validate queries without writing a script.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
