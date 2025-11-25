beforeEach(async () => {
# Test Data Isolation

## Overview

Polaris uses namespace-based isolation to separate test data from development data. Neo4j Community Edition doesn't support multiple databases in this setup, so tests share the same database but must use a strict prefixing convention to isolate test records.

## Prefix convention (enforced)

All test data MUST use the standardized prefix pattern: `test_<feature>_` (underscore). The feature/token inserted between `test_` and the trailing underscore should be unique and descriptive — typically the test filename or feature under test.

Examples:

- `test_myfeature_`
- `test_approval_`
- `test_component_repo_`

Using a single, consistent pattern simplifies cleanup and reduces accidental data collisions with development data.

## Cleanup mechanisms

Global setup and teardown scripts clean test-prefixed data before/after test runs. They look for properties that start with the enforced `test_` prefix and remove matching nodes.

**Global Setup** (`test/setup/global-setup.ts`)

- Runs once before all tests
- Cleans all nodes with properties that START WITH `test_`
- Removes leftover data from previous test runs

**Test Cleanup Hooks**

- Individual tests should use `afterAll` or `beforeEach` hooks to clean their own test data
- Helper utilities are available in `test/helpers/db-cleanup.ts`

### Cleanup Query

```cypher
MATCH (n)
WHERE any(prop IN keys(n) WHERE toString(n[prop]) STARTS WITH 'test_')
DETACH DELETE n
```

## Usage

### No setup required

Tests work out of the box. Available test scripts are defined in `package.json`; run `npm run` to list scripts and execute the desired script by name.

### Writing tests

Use the enforced prefix pattern for any test-created data. Example:

```typescript
// Example enforced prefix
const TEST_PREFIX = 'test_myfeature_'


  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

afterAll(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

// Create test data
await session.run(`
  CREATE (n:TestNode {name: $name})
`, { name: `${TEST_PREFIX}node1` })
```

If an example needs a generated name, follow the same pattern:

```typescript
const systemName = `test_system_${Date.now()}`
```

## Helper utilities

Available in `test/helpers/db-cleanup.ts`:

```typescript
import { cleanupTestData, verifyCleanDatabase, createCleanup } from '../helpers/db-cleanup'

// Clean by prefix
await cleanupTestData(driver, { prefix: 'test_mytest_' })

// Verify cleanup
const isClean = await verifyCleanDatabase(driver, 'test_mytest_')

// Create cleanup function
const cleanup = createCleanup(driver, { prefix: 'test_mytest_' })
afterAll(cleanup)
```

## Test status

This repository contains many test files across categories. Counts change frequently; avoid hard-coding totals in docs.

## Best practices

1. Use the enforced prefix pattern: `test_<feature>_`
2. Clean up test data in `afterAll` or `beforeEach`
3. Keep prefixes unique per test file or feature
4. Verify cleanup where appropriate using `verifyCleanDatabase()`
5. Never modify unprefixed (development) data in tests

## Configuration

### Environment variables

By default tests use the same database as development:

```bash
# Default (uses development database)
NEO4J_DATABASE=neo4j

# For Neo4j Enterprise Edition (optional)
NEO4J_TEST_DATABASE=test
```

### Vitest configuration

Test environment values are read from `vitest.config.ts` and environment variables. See that file for details.

## Troubleshooting

### Tests failing due to leftover data

Re-run the appropriate test script (see `package.json`) — global setup will clean leftover data. To list scripts:

```bash
npm run
```

Or manually clean test data:

```cypher
MATCH (n)
WHERE any(prop IN keys(n) WHERE toString(n[prop]) STARTS WITH 'test_')
DETACH DELETE n
```

### Development data affected by tests

If development data is affected:

1. Check for unprefixed data creation in tests
2. Ensure `beforeEach`/`afterEach` hooks are running correctly
3. Use `verifyCleanDatabase()` to find leftover test data

## Neo4j Enterprise Edition (optional)

If you have Neo4j Enterprise with multi-database support, you may prefer to run tests against a separate database. Use the `NEO4J_TEST_DATABASE` env var and the test scripts declared in `package.json`.

## Related documentation

- [Database Cleanup Utilities](./database-cleanup.md)
- [Coverage Configuration](./coverage-configuration.md)
- [Service Layer Pattern](../architecture/service-layer-pattern.md)

