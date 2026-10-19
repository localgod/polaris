# Agent Instructions for Polaris Project

This document provides context and instructions for AI agents working on this project.
Project architecture, commands and testing conventions live in [CLAUDE.md](CLAUDE.md);
this file covers the change workflow only.

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

3. The `ship-feature` skill (`.claude/skills/ship-feature/`) automates branch → checks → commit → draft PR.

## Repository Information

- **Repository:** https://github.com/localgod/polaris
- **Live Site:** https://localgod.github.io/polaris/
- **Owner:** localgod
