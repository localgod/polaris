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
