# Server test overview

This folder contains the server-side tests organized by layer. Keep this README as the canonical, high-level entrypoint for backend testing in Polaris. It provides:

- A brief description of the three-layer testing strategy
- A quick reference of locations and scripts
- Links to layer-specific README files for details and examples

## Three-layer strategy (summary)

- API tests (location: `test/server/api/`) — mock the service layer, test HTTP contracts and response structures.
- Service tests (location: `test/server/services/`) — mock repositories, test business logic and orchestration.
- Repository tests (location: `test/server/repositories/`) — use the test database and test queries/data mapping with isolation.

## Quick reference

- API: `test/server/api/` — read `test/server/api/README.md` for examples and BDD patterns.
- Services: `test/server/services/` — read `test/server/services/README.md` for service-level testing patterns.
- Repositories: `test/server/repositories/` — read `test/server/repositories/README.md` for DB tests and cleanup patterns.

## Scripts

Available test-related npm scripts are declared in `package.json`. Run `npm run` to list them. Typical commands:

```bash
# list scripts
npm run

# run all tests (example; adapt to your project scripts)
npm test
```

## Test isolation

Repository tests require a running Neo4j instance (the devcontainer config starts one). Use the `test_` prefix pattern and provided cleanup helpers when writing repository tests. See `test/server/repositories/README.md` for details.

## Links

- API tests: `test/server/api/README.md`
- Service tests: `test/server/services/README.md`
- Repository tests: `test/server/repositories/README.md`

## Last updated

2025-11-24 - Canonical server testing overview
