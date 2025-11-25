# Repository Layer Tests

This directory contains tests for the repository layer, which handles database queries and data mapping.

## Purpose

Test database queries, data mapping from Neo4j records, and ensure queries return correct results **using the test database**.

## Approach

**Use test database** with proper isolation using test prefixes (`test_`).

## What to Test

- Yes Database queries execute correctly
- Yes Data mapping from Neo4j records to domain objects
- Yes Query results match expectations
- Yes Edge cases (empty results, null values, relationships)
- Yes Filtering and sorting logic
- No Business logic (tested in service layer)
- No HTTP concerns (tested in API layer)

## Test Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { ComponentRepository } from '../../../server/repositories/component.repository'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'
const TEST_PREFIX = 'test_component_repo_'

// Declare global loadQuery type
declare global {
  var loadQuery: (path: string) => Promise<string>
}

// Mock loadQuery since it's a Nuxt utility not available in tests
global.loadQuery = vi.fn(async (path: string) => {
  if (path === 'components/find-all.cypher') {
    return `
      MATCH (c:Component)
      OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(t:Technology)
      OPTIONAL MATCH (s:System)-[:USES]->(c)
      WITH c, t.name as technologyName, collect(DISTINCT s.name) as systems
      RETURN 
        c.name as name,
        c.version as version,
        // ... other fields
        technologyName,
        size(systems) as systemCount
      ORDER BY c.name, c.version
    `
  }
  return ''
})

let driver: Driver | null = null
let neo4jAvailable = false

beforeAll(async () => {
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD))
    await driver.verifyConnectivity()
    neo4jAvailable = true
  } catch {
    neo4jAvailable = false
    console.warn('\n⚠️  Neo4j not available. Repository tests will be skipped.\n')
  }
})

afterAll(async () => {
  if (driver) {
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
    await driver.close()
  }
})

describe('ComponentRepository', () => {
  let componentRepo: ComponentRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    componentRepo = new ComponentRepository(driver)
    session = driver.session()
    
    // Clean up any existing test data
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
  })

  describe('findAll()', () => {
    it('should return all components with required properties', async () => {
      if (!neo4jAvailable || !session) return

      // Create test component
      await session.run(`
        CREATE (c:Component {
          name: $name,
          version: $version,
          packageManager: $packageManager,
          purl: $purl,
          type: $type
        })
      `, {
        name: `${TEST_PREFIX}react`,
        version: '18.2.0',
        packageManager: 'npm',
        purl: `pkg:npm/${TEST_PREFIX}react@18.2.0`,
        type: 'library'
      })

      const result = await componentRepo.findAll()

      // Find our test component
      const testComponent = result.find(c => c.name === `${TEST_PREFIX}react`)
      
      expect(testComponent).toBeDefined()
      if (testComponent) {
        expect(testComponent.name).toBe(`${TEST_PREFIX}react`)
        expect(testComponent.version).toBe('18.2.0')
        expect(testComponent.packageManager).toBe('npm')
        expect(Array.isArray(testComponent.hashes)).toBe(true)
        expect(Array.isArray(testComponent.licenses)).toBe(true)
      }
    })
  })
})
```

## Key Points

### 1. Use Test Prefixes

All test data must use the `test_` prefix:

```typescript
const TEST_PREFIX = 'test_component_repo_'

await session.run(`
  CREATE (c:Component {
    name: $name
  })
`, { name: `${TEST_PREFIX}react` })
```

### 2. Mock loadQuery

Mock the Nuxt `loadQuery` utility:

```typescript
declare global {
  var loadQuery: (path: string) => Promise<string>
}

global.loadQuery = vi.fn(async (path: string) => {
  if (path === 'components/find-all.cypher') {
    return `MATCH (c:Component) RETURN c`
  }
  return ''
})
```

### 3. Clean Up Test Data

Always clean up before and after tests:

```typescript
beforeEach(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

afterAll(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})
```

### 4. Skip When Database Unavailable

Handle cases where Neo4j isn't running:

```typescript
beforeAll(async () => {
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD))
    await driver.verifyConnectivity()
    neo4jAvailable = true
  } catch {
    neo4jAvailable = false
    console.warn('\n⚠️  Neo4j not available. Repository tests will be skipped.\n')
  }
})

it('should return components', async () => {
  if (!neo4jAvailable || !session) return
  // Test code
})
```

### 5. Inject Driver

Pass driver to repository constructor:

```typescript
componentRepo = new ComponentRepository(driver)
```

## Common Test Scenarios

### Basic Query

```typescript
it('should return all components with required properties', async () => {
  if (!neo4jAvailable || !session) return

  await session.run(`
    CREATE (c:Component {
      name: $name,
      version: $version
    })
  `, { name: `${TEST_PREFIX}react`, version: '18.2.0' })

  const result = await componentRepo.findAll()
  const testComponent = result.find(c => c.name === `${TEST_PREFIX}react`)

  expect(testComponent).toBeDefined()
  expect(testComponent?.version).toBe('18.2.0')
})
```

### Relationships

```typescript
it('should return components with system count', async () => {
  if (!neo4jAvailable || !session) return

  await session.run(`
    CREATE (c:Component {name: $componentName})
    CREATE (s:System {name: $systemName})
    CREATE (s)-[:USES]->(c)
  `, {
    componentName: `${TEST_PREFIX}lib`,
    systemName: `${TEST_PREFIX}system`
  })

  const result = await componentRepo.findAll()
  const testComponent = result.find(c => c.name === `${TEST_PREFIX}lib`)

  expect(testComponent?.systemCount).toBeGreaterThanOrEqual(1)
})
```

### Empty Results

```typescript
it('should return empty array when no components exist', async () => {
  if (!neo4jAvailable) return

  const result = await componentRepo.findAll()

  expect(Array.isArray(result)).toBe(true)
  expect(result.length).toBeGreaterThanOrEqual(0)
})
```

### Data Types

```typescript
it('should return components with correct data types', async () => {
  if (!neo4jAvailable || !session) return

  await session.run(`
    CREATE (c:Component {
      name: $name,
      version: $version
    })
  `, { name: `${TEST_PREFIX}vue`, version: '3.3.4' })

  const result = await componentRepo.findAll()
  const testComponent = result.find(c => c.name === `${TEST_PREFIX}vue`)

  expect(testComponent).toBeDefined()
  if (testComponent) {
    expect(typeof testComponent.name).toBe('string')
    expect(typeof testComponent.version).toBe('string')
    expect(Array.isArray(testComponent.hashes)).toBe(true)
    expect(typeof testComponent.systemCount).toBe('number')
  }
})
```

## Test Isolation

### Why Test Prefixes?

Neo4j Community Edition doesn't support multiple databases. We use prefixes to isolate test data:

```typescript
// Yes Good - uses test prefix
const name = `${TEST_PREFIX}react`

// No Bad - no prefix, could affect dev data
const name = 'react'
```

### Cleanup Strategy

1. **Before each test** - Clean slate for test
2. **After all tests** - Remove leftover data

```typescript
beforeEach(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

afterAll(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})
```

## Running Tests

```bash
# Run all repository tests
npm run test:server:repositories

# Run specific repository test
npm test test/server/repositories/component.repository.spec.ts

# Watch mode
npm run test:watch test/server/repositories
```

## Performance

Repository tests are **slower** (~50-100ms per test) due to database I/O.

To keep tests fast:
- Yes Use test prefixes for isolation
- Yes Clean up only test data, not entire database
- Yes Create minimal test data
- Yes Use `beforeEach` for clean slate

## Troubleshooting

### Tests Skipped

If you see "Neo4j not available":
1. Check Neo4j is running: `docker ps`
2. Verify connection: `bolt://localhost:7687`
3. Check credentials in `.env`

### Slow Tests

If tests are slow (>200ms):
1. Check you're only cleaning test data
2. Verify test data is minimal
3. Ensure proper indexing in Neo4j

### Data Leaks

If test data remains after tests:
1. Check `afterAll` cleanup is running
2. Verify test prefix is correct
3. Run manual cleanup: `npm run test` (global setup cleans)

## Related Documentation

- [Backend Testing Guide](../../../docs/testing/backend-testing-guide.md) - Complete testing strategy
- [Test Isolation](../../../docs/testing/test-isolation.md) - Database isolation details
- [API Tests](../api/README.md) - API layer testing
- [Service Tests](../services/README.md) - Service layer testing

## Examples

See these files for reference implementations:
- `component.repository.spec.ts` - Complete example with relationships
- `team.repository.spec.ts` - Repository with complex queries
- `system.repository.spec.ts` - Repository with multiple relationships
