## Polaris — Copilot Instructions

This file gives contextual guidance to GitHub Copilot / code suggestion systems to provide useful, safe, and repository-aware suggestions for contributors working on Polaris.

## High-level project summary

- Polaris is an enterprise Technology Catalog built with Nuxt 4 (Vue 3 + TypeScript) and Neo4j (graph DB).
- Server implements a 3-layer pattern: Endpoint (server/api) → Service (server/services) → Repository (server/repositories). Cypher queries live under `server/database/queries/`.
- Database schema and migrations are in `schema/` with an idempotent migration runner and seed/fixture system.
- Tests use Vitest and Gherkin-style feature files in `test/`. Neo4j Community Edition is used in the dev container; tests use prefix-based isolation (enforced pattern: `test_<feature>_`).

## Goals for suggestions

When offering completions, prioritize suggestions that:
- Follow existing architecture and patterns (3-layer server pattern, use of repositories + external `.cypher` files).
- Preserve type-safety (Typescript) and existing interfaces/types in `types/`.
- Include or update tests (happy-path + at least one edge case) when changing behavior in server or core logic.
- Keep migrations and schema changes small, reversible, and accompanied by `.down.cypher` rollback scripts.
- Update relevant documentation (`README.md`, `CONTRIBUTING.md`, or `content/`) when public behavior or developer workflow changes.

## Coding conventions & patterns

- Language: TypeScript for server and app code. Keep `type: "module"` semantics from `package.json`.
- Server imports: Always use relative imports within `server/` (e.g. `../services/my.service`). Do NOT use `~/server/` or `@` aliases in server code. Use `~~/` alias for types only when appropriate.
- Queries: Load `.cypher` files via the project's `loadQuery()` utility (auto-imported from `server/utils/`). Do not inline complex Cypher in TS files.
- Repository classes: Keep DB access logic in `server/repositories/*`. No business logic in repositories.
- Service classes: Business rules, orchestration and validation live in `server/services/*` and return `{ data, count }` where appropriate.
- Tests: Use the Gherkin-style feature files in `test/` and matching `.spec.ts` implementations. Test data must use the enforced prefix pattern `test_<feature>_`.
- Migrations: Name migrations using the timestamp template and include `.up` and `.down` cypher files. Prefer small, idempotent changes.

## Scripts you should reference

Use the scripts in `package.json` when producing run instructions or suggestions. Run `npm run` to list available scripts. Example script names you may find in `package.json` include:
- `npm run dev`, `npm run build`, `npm run preview`
- `npm run migrate:status|up|down|create|validate`
- `npm run seed`, `npm run seed:clear`
- test/coverage-related scripts (see `package.json` for exact names)
- `npm run lint`, `npm run lint:fix`, `npm run mdlint`

## Devcontainer & local environment

- Devcontainer is configured in `.devcontainer/devcontainer.json` and starts Neo4j (ports 7474 & 7687 forwarded).
- `postCreateCommand` runs `.devcontainer/scripts/post-create.sh` which sets up `.env`, dependencies and starts Neo4j.
- When giving setup steps, reference the devcontainer flow first (preferred), then local Docker Compose fallback (`.devcontainer/docker-compose.yml`).

## Tests & test data guidance

- Always add tests for server/service/repository changes. Unit tests for services and integration tests for repositories are expected.
- Use test data prefixes following the `test_<feature>_` pattern and ensure cleanup with `afterAll` / `beforeEach` hooks or provided cleanup helpers.
- When suggesting tests, include the matching `.feature` Gherkin file (if applicable) and a `.spec.ts` that implements the steps.

## Documentation & PR workflow

- If a suggestion changes public APIs, environment variables, developer workflow, or schema, include updates to relevant docs (`README.md`, `CONTRIBUTING.md`, `content/` or `docs/`).
- Branch protection: `main` is protected. All changes must go through feature branches and PRs. Suggest clear commit messages and PR descriptions.
- When suggesting commit messages or PR titles, use the project's prefixes: `Add:`, `Fix:`, `Update:`, `Refactor:`, `Docs:`.

## Security, secrets, and sensitive data

- Never expose secrets, API keys, tokens, or `.env` values in suggestions. Replace secrets with placeholders (e.g. `process.env.NEO4J_PASSWORD`).
- When referencing API tokens, note that tokens are shown once at creation (see server README). Do not suggest printing or storing plaintext tokens in the repo.
- Avoid suggesting code that would log secrets or PII in production. For audit logging suggestions, recommend excluding credentials and sensitive values.

## Areas where caution is required

- Schema and migration changes: recommend running migrations in a test/dev environment first and provide rollback scripts. Suggest small, reversible steps.
- Production database changes: do not suggest destructive commands or data wipes without explicit confirmation and safe rollback instructions.
- CI/CD changes: changes to GitHub Actions or branch protection rules are sensitive—flag them and avoid automatic edits.

## Helpful verification steps to include in suggestions

When changing code, suggest a short verification checklist, for example:
1. Run `npm run lint` and `npm run mdlint`.
2. Run the relevant test script(s) declared in `package.json` locally (use `npm run` to list available scripts). For CI-like output, run the script named for CI/tests in `package.json`.
3. Run `npm run migrate:status` and `npm run migrate:validate` before applying migrations.
4. Start the devcontainer (`Reopen in container`) or run `npm run dev` and check http://localhost:3000.

## Good vs Bad suggestion examples

- Good: "Add a `TeamService` method `findByName` that uses `TeamRepository.findByName()`. Add unit tests for service logic and update `server/api/teams/[name].get.ts` to use the service."
- Bad: "Inline a Cypher query inside the API route (breaking the repository pattern)." 
- Good: "When adding a migration, generate `.up.cypher` and `.down.cypher` files with descriptive header comments and a `migrate:create` command example." 
- Bad: "Suggest altering `main` branch protection or direct pushes to `main`."

## Prompting tips for human users (examples to include in PR descriptions)

- "Implement: Add service to validate TIME approvals for a technology; include unit tests and update API endpoint."
- "Docs: Update `CONTRIBUTING.md` with new migration best practices and required test isolation pattern." 
- "Migrations: Create migration `add_auditlog_schema` with up/down scripts and include verification Cypher queries." 

## Contributor etiquette

- Respect the Code of Conduct in `CODE_OF_CONDUCT.md`.
- Keep suggestions concise and provide reasoning when proposing architectural changes.
- Prefer documentation and tests alongside code changes.

## When to refuse or escalate

If a requested suggestion would:
- Expose secrets or credentials
- Require changing production policy (branch protection/CI) without review
- Perform large, risky schema migrations without tests or rollback

Then respond with a clarification request or recommend opening an issue/PR for discussion.

---

Last reviewed: 2025-11-19

References: `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `.devcontainer/devcontainer.json`, `package.json`