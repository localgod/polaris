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

## Branch Workflow

`main` is protected — all changes go through PRs. Never push directly to `main`. See `AGENTS.md` for the full PR workflow.

## MCP Servers

Five MCP servers are configured in `.mcp.json`:

| Server | Purpose |
| ------ | ------- |
| `local-model` | Local Qwen 2.5 7B (Docker Model Runner) — offloads mechanical tasks (tests, lint, docs, commit/PR text, Cypher drafting, snippet review) so the main model doesn't burn context on raw tool output |
| `code-review-graph` | Persistent Tree-sitter–derived knowledge graph of this repo — structural code search, impact analysis, and review context, cheaper and more accurate than Grep/Read for "who calls/imports/tests this" questions |
| `neo4j` | Direct Bolt connection to the live application database (`bolt://localhost:7687`) — raw Cypher access for exploring or mutating actual `Technology`/`Component`/`Team`/... data, distinct from the code-review-graph's internal graph |
| `playwright` | Official Microsoft Playwright MCP — drives a real (headless) browser via accessibility-tree snapshots for clicking, filling forms, and navigating. Default choice for verifying a UI change actually works end-to-end (e.g. a modal save button) instead of trusting a code read alone |
| `chrome-devtools` | Google's Chrome DevTools MCP — same headless Chromium binary as `playwright` (reused from `~/.cache/ms-playwright` to avoid a second download), but exposes DevTools protocol tools: network request inspection, performance traces, console output. Reach for this over `playwright` when a task needs network/perf/console visibility (e.g. the LCP/chunk-loading investigation in issue #693), not just interaction |

Both browser servers run headless/sandboxless (`--no-sandbox`) since the devcontainer has no display — this is standard practice for containerized browser automation, not a security relaxation of the app itself.

### local-model

**IMPORTANT: these are deferred MCP tools — always load their schema with
`ToolSearch("select:run_tests,run_lint,run_mdlint")` (etc.) up front and use
them. Do NOT run `npm test` / `npm run lint` / `npm run mdlint` via Bash;
that is a fallback only, never the default.**

| Tool | Use instead of |
| ---- | -------------- |

| Tool | Use instead of |
| ---- | -------------- |
| `run_tests` | `npm test` via Bash — returns a diagnosis, not raw output |
| `run_lint` | `npm run lint` via Bash — returns grouped issues |
| `run_mdlint` | `npm run mdlint` via Bash — returns grouped issues |
| `generate_docs` | `npm run docs:api` via Bash — reports what changed or diagnoses the failure |
| `draft_commit_message` | Writing commit messages manually — pass `git diff HEAD` |
| `create_pr_body` | Writing PR descriptions manually — pass `git diff main...HEAD` |
| `draft_cypher` | Writing Cypher queries from scratch — describe what you need in plain English |
| `review_snippet` | First-pass review before a deep dive — flags convention violations |
| `summarize_code` | Reading an unfamiliar file line-by-line — get a quick overview first |
| `ask_local_model` | General free-form question to offload from the main model |

### neo4j

Direct Cypher access to the live application database (real data, not the code graph) — use it to explore or validate data without writing a throwaway script:

| Tool | Use when |
| ---- | -------- |
| `execute_query` | Run an arbitrary read/write Cypher query against the live DB |
| `create_node` | Create a single node (e.g. seeding/fixing data by hand) |
| `create_relationship` | Create a single relationship between existing nodes |

### code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

#### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

#### Core tools (day-to-day)

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `traverse_graph` | Multi-hop walk from a node (e.g. transitive dependents) |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` / `apply_refactor_tool` | Planning renames/dead-code removal, then applying it |

#### Architecture & discovery

| Tool | Use when |
| ---- | -------- |
| `list_communities` / `get_community` | Grouping related files/modules into clusters |
| `get_hub_nodes` / `get_bridge_nodes` | Finding highly-connected or cross-cutting code |
| `get_surprising_connections` | Spotting unexpected couplings between distant modules |
| `get_knowledge_gaps` | Finding under-documented/under-tested areas |
| `get_suggested_questions` | Getting starter questions when new to the repo |
| `get_minimal_context` | Smallest set of nodes needed to understand a symbol |
| `find_large_functions` | Locating refactor candidates by size/complexity |
| `list_flows` / `get_flow` | Listing and inspecting named execution flows |
| `list_graph_stats` | Node/edge counts, languages, last build info |

#### Docs & maintenance

| Tool | Use when |
| ---- | -------- |
| `generate_wiki` / `get_wiki_page` / `get_docs_section` | Generating or reading repo wiki-style docs from the graph |
| `build_or_update_graph` | Rebuilding the graph after switching branches (see warning below) |
| `run_postprocess` | Re-running graph post-processing (communities, embeddings) after a build |
| `embed_graph` | (Re)computing embeddings used by semantic search |
| `list_repos` / `cross_repo_search` | Working across multiple graphed repos |

#### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
5. If the graph reports it was built on a different branch than the current one, run `build_or_update_graph` before trusting results.
