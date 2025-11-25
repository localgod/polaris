# Database Cleanup in Tests

## Problem

Tests that interact with the database can leave data behind, causing:
- Test pollution (one test affects another)
- Flaky tests (pass/fail depends on execution order)
- Database bloat (accumulation of test data)
- False positives/negatives

## Solution

Use consistent cleanup patterns with the `db-cleanup` helper utilities.

## Test Data Naming Convention

**All test data MUST use a prefix**: `test_<testname>_`

```typescript
const TEST_PREFIX = 'test_myfeature_'

// Good
{ name: 'test_myfeature_user1' }
{ email: 'test_myfeature_user@example.com' }

// Bad
{ name: 'user1' }  // No prefix - will not be cleaned up
{ name: 'test_user1' }  // Generic prefix - may conflict
```

## Cleanup Patterns

### Pattern 1: Clean Before Each Test (Recommended)

Best for isolated tests that don't depend on each other.

```typescript
import { cleanupTestData } from '../helpers/db-cleanup'

const TEST_PREFIX = 'test_myfeature_'

beforeEach(async () => {
  if (!serverRunning) return
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

afterAll(async () => {
  if (serverRunning && driver) {
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
    await driver.close()
  }
})
```

### Pattern 2: Clean After All Tests

Best for tests that build on each other.

```typescript
import { createCleanup } from '../helpers/db-cleanup'

const cleanup = createCleanup(driver, { prefix: TEST_PREFIX })

afterAll(async () => {
  if (serverRunning) {
    await cleanup()
    await driver.close()
  }
})
```

### Pattern 3: Explicit Cleanup in Test

Best for tests that need to verify cleanup behavior.

```typescript
And('cleanup removes the test data', async () => {
  if (!serverRunning) return
  
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
  
  const isClean = await verifyCleanDatabase(driver, TEST_PREFIX)
  expect(isClean).toBe(true)
})
```

## Helper Functions

### `cleanupTestData(driver, options)`

Remove test data from the database.

```typescript
// Clean by prefix
await cleanupTestData(driver, { prefix: 'test_myfeature_' })

// Clean specific labels
await cleanupTestData(driver, { 
  prefix: 'test_myfeature_',
  labels: ['User', 'Team']
})

// Clean all test data
await cleanupTestData(driver, { deleteAll: true })
```

### `createCleanup(driver, options)`

Create a reusable cleanup function.

```typescript
const cleanup = createCleanup(driver, { prefix: 'test_myfeature_' })

afterAll(cleanup)
```

### `verifyCleanDatabase(driver, prefix)`

Verify no test data remains.

```typescript
const isClean = await verifyCleanDatabase(driver, 'test_myfeature_')
expect(isClean).toBe(true)
```

### `createIsolatedTest(driver, prefix)`

Create an isolated test session with automatic cleanup.

```typescript
const { session, cleanup } = await createIsolatedTest(driver, 'test_myfeature_')

try {
  await session.run('CREATE (n:Test {name: $name})', { 
    name: 'test_myfeature_node' 
  })
  // ... test code
} finally {
  await cleanup()
}
```

### `snapshotDatabase(driver)` & `compareSnapshots(before, after)`

Verify database state hasn't changed.

```typescript
const before = await snapshotDatabase(driver)

// ... test code that shouldn't modify database

const after = await snapshotDatabase(driver)
const unchanged = compareSnapshots(before, after)
expect(unchanged).toBe(true)
```

## Global Setup/Teardown

The test suite automatically cleans up test data:

- **Before all tests**: `test/setup/global-setup.ts` removes leftover data
- **After all tests**: `test/setup/global-teardown.ts` removes all test data

## Best Practices

### Yes DO

- Use unique prefixes for each test file: `test_<filename>_`
- Clean up in `afterAll` hook
- Use `beforeEach` for test isolation
- Verify cleanup with `verifyCleanDatabase`
- Use `DETACH DELETE` to remove relationships

### No DON'T

- Create data without a test prefix
- Rely on test execution order
- Skip cleanup in `afterAll`
- Use generic prefixes like `test_`
- Leave test data in the database

## Example: Complete Test with Cleanup

```typescript
import { expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Feature } from '../helpers/gherkin'
import type { Driver } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { cleanupTestData, verifyCleanDatabase } from '../helpers/db-cleanup'

Feature('My Feature @model', ({ Scenario }) => {
  let driver: Driver
  let serverRunning = false
  const TEST_PREFIX = 'test_myfeature_'

  beforeAll(async () => {
    try {
      driver = neo4j.driver(
        process.env.NEO4J_URI || 'bolt://localhost:7687',
        neo4j.auth.basic(
          process.env.NEO4J_USERNAME || 'neo4j',
          process.env.NEO4J_PASSWORD || 'devpassword'
        )
      )
      await driver.verifyConnectivity()
      serverRunning = true
    } catch {
      console.warn('\n⚠️  Neo4j not available. Tests will be skipped.\n')
      serverRunning = false
    }
  })

  afterAll(async () => {
    if (serverRunning && driver) {
      await cleanupTestData(driver, { prefix: TEST_PREFIX })
      
      // Verify cleanup
      const isClean = await verifyCleanDatabase(driver, TEST_PREFIX)
      if (!isClean) {
        console.warn('⚠️  Warning: Test data was not fully cleaned up')
      }
      
      await driver.close()
    }
  })

  beforeEach(async () => {
    if (!serverRunning) return
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
  })

  Scenario('Test with proper cleanup', ({ Given, When, Then }) => {
    Given('I create test data', async () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - database not available')
        return
      }
      
      const session = driver.session()
      try {
        await session.run(`
          CREATE (n:TestNode {name: $name})
        `, { name: `${TEST_PREFIX}node1` })
      } finally {
        await session.close()
      }
    })

    When('I query the data', async () => {
      if (!serverRunning) return
      // ... test code
    })

    Then('cleanup should work', async () => {
      if (!serverRunning) return
      
      await cleanupTestData(driver, { prefix: TEST_PREFIX })
      const isClean = await verifyCleanDatabase(driver, TEST_PREFIX)
      expect(isClean).toBe(true)
    })
  })
})
```

## Troubleshooting

### Test data not being cleaned up

1. Check that all test data uses the correct prefix
2. Verify `afterAll` hook is running
3. Check for errors in cleanup code
4. Use `verifyCleanDatabase` to confirm

### Tests failing due to leftover data

1. Global setup/teardown scripts are declared in `package.json`; run `npm run` to list available test/setup scripts and use the appropriate script name for manual setup
2. Check for tests without proper cleanup
3. Ensure unique prefixes per test file

### Database bloat

1. Global teardown scripts are declared in `package.json`; run `npm run` to list available scripts and run the appropriate teardown script by name
2. Manually clean: `MATCH (n) WHERE any(prop IN keys(n) WHERE n[prop] STARTS WITH 'test_') DETACH DELETE n`

## See Also

- [Test Examples](../../test/examples/proper-cleanup.spec.ts)
- [DB Cleanup Utilities](../../test/helpers/db-cleanup.ts)
- [Global Setup](../../test/setup/global-setup.ts)
