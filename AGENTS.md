# Agent Instructions for Polaris Project

This document provides context and instructions for AI agents working on this project.

## Branch Protection and Pull Request Workflow

**This repository enforces branch protection on the `main` branch.**

### What This Means

- Direct pushes to `main` are blocked
- All changes must go through Pull Requests
- CI checks (linting, build, test) must pass before merging
- Code review may be required (depending on configuration)

### Workflow for Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/descriptive-name
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. **Push to the feature branch:**
   ```bash
   git push origin feature/descriptive-name
   ```

4. **Create a Pull Request:**
   ```bash
   gh pr create --title "Title" --body "Description"
   ```

5. **Wait for CI checks and review**

6. **Merge the PR** (via GitHub UI or CLI)

## Important Notes for Agents

1. **NEVER commit or push changes unless explicitly asked to do so by the user.** This is critical - always wait for explicit permission before committing.

2. **This repository uses branch protection rules.** Direct pushes to the `main` branch are not allowed. All changes must go through Pull Requests. When the user asks to commit changes, remind them that they'll need to create a PR or temporarily disable branch protection.

## Resources

- [Vite Configuration](https://vitejs.dev/config/)
- [markdownlint Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)

## Repository Information

- **Repository:** https://github.com/localgod/polaris
- **Live Site:** https://localgod.github.io/polaris/
- **Owner:** localgod

## Last Updated

2025-10-14 - Initial version documenting project setup and configuration

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
