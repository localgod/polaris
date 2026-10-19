# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Shared project guidance — commands, architecture, testing conventions, migrations and the
branch/PR workflow — lives in `AGENTS.md` and is imported here. Keep tool-agnostic content
there; this file holds only Claude Code-specific guidance.

@AGENTS.md

## MCP Servers

Five MCP servers are configured in `.mcp.json`:

| Server | Purpose |
| ------ | ------- |
| `local-model` | Local Qwen3 14B served by Ollama on the host (`host.docker.internal:11434`) — offloads mechanical tasks (lint, docs, commit/PR text, Cypher drafting, snippet review) so the main model doesn't burn context on raw tool output. Test diagnosis is *not* handled here — see `test-runner` under Agents below |
| `code-review-graph` | Persistent Tree-sitter–derived knowledge graph of this repo — structural code search, impact analysis, and review context, cheaper and more accurate than Grep/Read for "who calls/imports/tests this" questions |
| `neo4j` | Direct Bolt connection to the live application database (`bolt://localhost:7687`) — raw Cypher access for exploring or mutating actual `Technology`/`Component`/`Team`/... data, distinct from the code-review-graph's internal graph |
| `chrome-devtools` | Google's Chrome DevTools MCP — drives a real headless Chromium binary (Playwright's, resolved at launch by `.claude/mcp/chrome-devtools.sh`) via accessibility-tree snapshots for clicking, filling forms, and navigating, plus DevTools protocol tools: network request inspection, performance traces, console output. Default choice for verifying a UI change actually works end-to-end (e.g. a modal save button) instead of trusting a code read alone |
| `nuxt-ui` | Official remote Nuxt UI MCP server (`https://ui.nuxt.com/mcp`, HTTP, no auth) — live component/composable API docs (props, slots, events), examples, icon search and migration guides for `@nuxt/ui` v4 |

The browser server runs headless/sandboxless (`--no-sandbox`) since the devcontainer has no display — this is standard practice for containerized browser automation, not a security relaxation of the app itself.

### local-model

**IMPORTANT: these are deferred MCP tools — always load their schema with
`ToolSearch("select:run_lint,run_mdlint")` (etc.) up front and use
them. Do NOT run `npm run lint` / `npm run mdlint` via Bash;
that is a fallback only, never the default.**

| Tool | Use instead of |
| ---- | -------------- |
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

### nuxt-ui

Source of truth for the `@nuxt/ui` API — use it instead of guessing props
or reading `node_modules`. The `nuxt-ui` skill (`.claude/skills/nuxt-ui/`)
covers *how* to compose UIs; this server answers *what* a component accepts.

| Tool | Use when |
| ---- | -------- |
| `search-components` / `search-composables` | Finding the right component or composable for a use case |
| `get-component-metadata` | Checking props, slots and events before using a component |
| `get-component` | Full docs + usage examples — pass `sections` to keep the response small |
| `search-documentation` / `get-documentation-page` | Theming, config and guides — pass `headings` to fetch only what you need |
| `search-icons` | Resolving an icon name (`i-lucide-*` by default) |
| `list-examples` / `get-example` | Looking for a reference implementation |
| `get-migration-guide` | Upgrading `@nuxt/ui` across major versions |

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

## Agents

### test-runner

A Haiku-backed subagent defined in `.claude/agents/test-runner.md`. Use it
(via the Agent tool, `subagent_type: "test-runner"`) instead of `npm test` /
`npx vitest` via Bash, and instead of the local model — it replaced a
`run_tests` local-model MCP tool that was unreliable for this: a small
quantized model summarizing large Vitest output would silently truncate or
invent file/test names that didn't exist. Haiku costs real tokens but is
accurate enough to trust the diagnosis without re-verifying it.

Invoke it once per layer or file, never over the whole suite in one call —
this keeps each run's output small enough to summarize accurately:

1. `npm run test:server:api`
2. `npm run test:server:services`
3. `npm run test:server:repositories`
4. `npm run test:server:utils`
5. `npm run test:server:middleware`
6. `npm run test:app:unit`
7. `npx vitest run test/schema`
8. `npx vitest run test/app/e2e`

Together these cover the same suite as `npm run test` (everything except
`test/integration/**`).
