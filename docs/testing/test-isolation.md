# Test Data Isolation

## Overview

Polaris uses **namespace-based isolation** to separate test data from development data. Since Neo4j Community Edition doesn't support multiple databases, tests share the same database but use prefixed data for isolation.

## How It Works

### Prefix Patterns

All test data uses one of two supported prefix patterns:

- **Underscore**: `test_` (e.g., `test_example_`, `policy_test_`)
- **Hyphen**: `test-` (e.g., `test-system-`, `test-user-`)

Both patterns are supported and cleaned automatically.

### Cleanup Mechanisms

**Global Setup** (`test/setup/global-setup.ts`)
- Runs once before all tests
- Cleans all nodes with `test_` or `test-` prefixed properties
- Removes leftover data from previous test runs

**Test Cleanup Hooks**
- Individual tests use `afterAll` hooks to clean their data
- Some tests use `beforeEach` for clean slate per test
- Helper utilities available in `test/helpers/db-cleanup.ts`

### Cleanup Query

```cypher
MATCH (n)
WHERE any(prop IN keys(n) WHERE 
  toString(n[prop]) STARTS WITH 'test_' OR 
  toString(n[prop]) STARTS WITH 'test-'
)
DETACH DELETE n
```

## Usage

### No Setup Required

Tests work out of the box:

```bash
npm test
```

### Writing Tests

Use test prefixes for all data:

```typescript
// Example with underscore prefix
const TEST_PREFIX = 'test_myfeature_'

beforeEach(async () => {
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

```typescript
// Example with hyphen prefix
const systemName = `test-system-${Date.now()}`

afterAll(async () => {
  // Cleanup via API
  await fetch(`/api/systems/${systemName}`, { method: 'DELETE' })
})
```

### Helper Utilities

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

## Test Status

**Total Tests**: 75 across 13 test files  
**Status**: Yes All properly isolated

### Test Categories

**API Tests (18 tests)**
- Health checks, systems, teams, unmapped components
- Mix of read-only and data-creating tests
- Proper cleanup where needed

**Model Tests (56 tests)**
- Approval resolution, audit trail, migrations, policy enforcement
- Team technology approvals, usage tracking, version-specific approvals
- All use proper prefixes and cleanup

**UI Tests (1 test)**
- Homepage UI test (read-only)

**Example Tests (2 tests)**
- Reference implementation in `test/examples/proper-cleanup.spec.ts`

## Best Practices

1. **Use test prefixes** - Always prefix test data with `test_` or `test-`
2. **Clean up after tests** - Use `afterAll` or `afterEach` hooks
3. **Be consistent** - Use the same prefix pattern within a test file
4. **Verify cleanup** - Use `verifyCleanDatabase()` in critical tests
5. **Don't modify unprefixed data** - Never touch development data in tests

## Configuration

### Environment Variables

Tests use the same database as development by default:

```bash
# Default (uses development database)
NEO4J_DATABASE=neo4j

# For Neo4j Enterprise Edition (optional)
NEO4J_TEST_DATABASE=test
```

### Vitest Configuration

Test environment configured in `vitest.config.ts`:

```typescript
env: {
  NEO4J_URI: process.env.NEO4J_TEST_URI || process.env.NEO4J_URI || 'bolt://localhost:7687',
  NEO4J_USERNAME: process.env.NEO4J_TEST_USERNAME || process.env.NEO4J_USERNAME || 'neo4j',
  NEO4J_PASSWORD: process.env.NEO4J_TEST_PASSWORD || process.env.NEO4J_PASSWORD || 'devpassword',
  NEO4J_DATABASE: process.env.NEO4J_TEST_DATABASE || 'neo4j',
}
```

## Troubleshooting

### Tests Failing Due to Leftover Data

Run tests again - global setup will clean leftover data:

```bash
npm test
```

Or manually clean test data:

```cypher
MATCH (n)
WHERE any(prop IN keys(n) WHERE 
  toString(n[prop]) STARTS WITH 'test_' OR 
  toString(n[prop]) STARTS WITH 'test-'
)
DETACH DELETE n
```

### Development Data Affected by Tests

This shouldn't happen if tests follow prefix conventions. If it does:

1. Check test code for unprefixed data creation
2. Verify `beforeEach`/`afterEach` hooks are cleaning up properly
3. Review test data creation patterns

## Neo4j Enterprise Edition (Optional)

If you have Neo4j Enterprise Edition with multi-database support, you can use true database isolation:

1. Create separate test database:
   ```cypher
   CREATE DATABASE test
   ```

2. Set environment variable:
   ```bash
   export NEO4J_TEST_DATABASE=test
   ```

3. Run tests:
   ```bash
   npm test
   ```

Tests will use the separate `test` database instead of namespace-based isolation.

## Related Documentation

- [Database Cleanup Utilities](./database-cleanup.md) - Helper functions
- [Coverage Configuration](./coverage-configuration.md) - Test coverage setup
- [Service Layer Pattern](../architecture/service-layer-pattern.md) - Architecture overview
