---
name: ship-feature
description: Create a feature branch from the current changes, run mdlint/lint/tests/docs generation, and if everything passes commit, push, and open a draft PR.
---

## Ship Feature

Package up the current working-tree changes into a feature branch, verify
them the same way CI does, and — only if every check passes — commit, push,
and open a draft PR. Invoking this skill is the user's explicit go-ahead to
carry the flow through to the PR; do not pause for extra confirmation once
checks pass.

### Steps

1. **Branch**: If an argument was passed, slugify it (kebab-case) for the
   branch suffix; otherwise inspect `git status` / `git diff --stat` and
   derive a short descriptive slug, or ask the user. Skip this step if
   already on a `feature/*` branch. Run `git checkout -b feature/<slug>` from
   the current HEAD — do not pull/rebase `main` first, since there may be
   uncommitted local changes to carry over, not to rebase.
2. **Markdown lint**: run `run_mdlint`. Stop and report on failure — nothing
   gets committed.
3. **Lint**: run `run_lint` (no `fix`, read-only check). Stop and report
   grouped issues on failure.
4. **Tests**: run `run_tests` with `layer: "all"` — mirrors `npm run test`.
   Stop and report the diagnosis on failure.
5. **Docs**: run `generate_docs`. This may modify `public/openapi.json`,
   which is tracked and should be included in the commit.
6. **Stage**: review `git status --porcelain` — flag anything unexpected
   (`.env`, credentials, stray binaries) before staging — then stage all the
   intended changed/new/generated files.
7. **Commit message**: run `draft_commit_message` with `diff` set to
   `git diff HEAD` (the staged diff) and `context` set to the feature
   slug/description. Use the returned message for `git commit -m`.
8. **Push**: `git push -u origin feature/<slug>`.
9. **PR body**: run `create_pr_body` with `diff` set to `git diff main...HEAD`
   and optional `context`. Use the returned title + body.
10. **Open PR**: `gh pr create --title "<title>" --body "<body>"`
    (use a heredoc for the body), base `main`.
11. Report the PR URL back to the user.

### Safety

- Any failure in steps 2–5 halts the flow before committing — the branch and
  the uncommitted changes are left intact for the user to fix.
- Never force-push.
- Never target `main` directly — `main` is protected; all changes go through
  a PR (see `AGENTS.md`).
