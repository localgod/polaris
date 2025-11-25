# Backend Testing Guide

## Overview

Polaris uses a **three-layer testing strategy** that mirrors the service layer architecture. Each layer is tested in isolation with appropriate mocking to ensure fast, reliable, and maintainable tests.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer Tests                         │
│  Mock: Service Layer                                         │
│  Focus: HTTP contracts, response structure                   │
│  Speed: ~10ms                                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer Tests                       │
│  Mock: Repository Layer                                      │
│  Focus: Business logic, data transformation                  │
│  Speed: ~10ms                                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer Tests                      │
│  Mock: None (uses test database)                            │
│  Focus: Database queries, data mapping                       │
│  Speed: ~50-100ms                                            │
└─────────────────────────────────────────────────────────────┘
```

## Layer 1: API Tests

### Purpose

Test API endpoints to ensure they return correct response structures and handle errors properly.

### Location

`test/server/api/`

### Approach

**Mock the service layer** - No database calls, no business logic testing.

### What to Test

- Yes Response structure (success, data, count, error)
- Yes Required fields and correct types
- Yes Error handling when service fails
- Yes Empty results handling
- No Business logic (belongs in service tests)
- No Database queries (belongs in repository tests)

### Example

```typescript
import { expect, beforeEach, vi } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import type { ApiResponse, Component } from '~~/types/api'
import { ComponentService } from '../../../server/services/component.service'

// Mock the service layer
vi.mock('../../../server/services/component.service')

const mockComponents: Component[] = [
  {
    name: 'react',
    version: '18.2.0',
    packageManager: 'npm',
    purl: 'pkg:npm/react@18.2.0',
    // ... other required fields
  }
]

beforeEach(() => {
  vi.clearAllMocks()
})

const feature = await loadFeature('./test/server/api/components.feature')

describeFeature(feature, ({ Scenario }) => {
  let responseData: ApiResponse<Component>

  Scenario('Successfully retrieve all components', ({ When, Then, And }) => {
    When('I request GET "/api/components"', async () => {
      // Mock successful service response
      vi.mocked(ComponentService.prototype.findAll).mockResolvedValue({
        data: mockComponents,
        count: mockComponents.length
      })

      // Simulate API endpoint logic
      const componentService = new ComponentService()
      const result = await componentService.findAll()
      
      responseData = {
        success: true,
        data: result.data,
        count: result.count
      }
    })

    Then('the response status should be 200', () => {
      expect(responseData).toBeDefined()
    })

    And('the response should have property "success" equal to true', () => {
      expect(responseData.success).toBe(true)
    })

    And('the response should have property "data" as an array', () => {
      expect(Array.isArray(responseData.data)).toBe(true)
    })

    And('the response should have property "count" as a number', () => {
      if (responseData.success) {
        expect(typeof responseData.count).toBe('number')
      }
    })
  })

  Scenario('API handles service errors gracefully', ({ When, Then }) => {
    When('I request GET "/api/components"', async () => {
      // Mock service throwing an error
      vi.mocked(ComponentService.prototype.findAll).mockRejectedValue(
        new Error('Database connection failed')
      )

      // Simulate API endpoint error handling
      try {
        const componentService = new ComponentService()
        await componentService.findAll()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch'
        responseData = {
          success: false,
          error: errorMessage,
          data: []
        }
      }
    })

    Then('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    Then('the response should have property "error" as a string', () => {
      if (!responseData.success) {
        expect(typeof responseData.error).toBe('string')
      }
    })
  })
})
```

### Key Points

- Use `vi.mock()` to mock the service
- Test response structure, not implementation
- Fast execution (~10ms per test)
- No database dependencies

## Layer 2: Service Tests

### Purpose

Test business logic, data transformation, and orchestration between repositories.

### Location

`test/server/services/`

### Approach

**Mock the repository layer** - No database calls, focus on business rules.

### What to Test

- Yes Business rules and validation
- Yes Data transformation logic
- Yes Count calculation
- Yes Error propagation from repository
- Yes Multiple repository orchestration
- No HTTP concerns (belongs in API tests)
- No Database queries (belongs in repository tests)

### Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComponentService } from '../../../server/services/component.service'
import { ComponentRepository } from '../../../server/repositories/component.repository'
import type { Component } from '~~/types/api'

// Mock the repository layer
vi.mock('../../../server/repositories/component.repository')

describe('ComponentService', () => {
  let componentService: ComponentService
  let mockComponentRepo: ComponentRepository

  const mockComponents: Component[] = [
    {
      name: 'react',
      version: '18.2.0',
      packageManager: 'npm',
      purl: 'pkg:npm/react@18.2.0',
      // ... other required fields
    },
    {
      name: 'vue',
      version: '3.3.4',
      packageManager: 'npm',
      purl: 'pkg:npm/vue@3.3.4',
      // ... other required fields
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    componentService = new ComponentService()
    mockComponentRepo = componentService['componentRepo']
  })

  describe('findAll()', () => {
    it('should return all components with correct count', async () => {
      // Arrange
      vi.mocked(mockComponentRepo.findAll).mockResolvedValue(mockComponents)

      // Act
      const result = await componentService.findAll()

      // Assert
      expect(mockComponentRepo.findAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        data: mockComponents,
        count: 2
      })
    })

    it('should return empty array when no components exist', async () => {
      // Arrange
      vi.mocked(mockComponentRepo.findAll).mockResolvedValue([])

      // Act
      const result = await componentService.findAll()

      // Assert
      expect(result).toEqual({
        data: [],
        count: 0
      })
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database connection failed')
      vi.mocked(mockComponentRepo.findAll).mockRejectedValue(error)

      // Act & Assert
      await expect(componentService.findAll()).rejects.toThrow('Database connection failed')
    })
  })
})
```

### Key Points

- Use `vi.mock()` to mock the repository
- Test business logic, not data access
- Fast execution (~10ms per test)
- No database dependencies

## Layer 3: Repository Tests

### Purpose

Test database queries, data mapping, and ensure queries return correct results.

### Location

`test/server/repositories/`

### Approach

**Use test database** with proper isolation using test prefixes.

### What to Test

- Yes Database queries execute correctly
- Yes Data mapping from Neo4j records to domain objects
- Yes Query results match expectations
- Yes Edge cases (empty results, null values, relationships)
- Yes Filtering and sorting logic
- No Business logic (belongs in service tests)
- No HTTP concerns (belongs in API tests)

### Example

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
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
        c.packageManager as packageManager,
        c.purl as purl,
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

    it('should return components with system count', async () => {
      if (!neo4jAvailable || !session) return

      // Create test component and system
      await session.run(`
        CREATE (c:Component {
          name: $componentName,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
        CREATE (s:System {
          name: $systemName
        })
        CREATE (s)-[:USES]->(c)
      `, {
        componentName: `${TEST_PREFIX}internal-lib`,
        systemName: `${TEST_PREFIX}system-a`,
        purl: `pkg:npm/${TEST_PREFIX}internal-lib@1.0.0`
      })

      const result = await componentRepo.findAll()
      const testComponent = result.find(c => c.name === `${TEST_PREFIX}internal-lib`)

      expect(testComponent).toBeDefined()
      if (testComponent) {
        expect(testComponent.systemCount).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
```

### Key Points

- Use real database with test prefixes
- Mock `loadQuery` utility (Nuxt-specific)
- Clean up test data before/after tests
- Test actual database operations
- Slower execution (~50-100ms per test)

## Test Isolation

### Prefix Pattern

All test data must use the `test_` prefix:

```typescript
const TEST_PREFIX = 'test_component_repo_'

// Create test data
await session.run(`
  CREATE (c:Component {
    name: $name
  })
`, { name: `${TEST_PREFIX}react` })
```

### Cleanup

Use the `cleanupTestData` helper:

```typescript
import { cleanupTestData } from '../../fixtures/db-cleanup'

beforeEach(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

afterAll(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific layer
npm run test:server:api
npm run test:server:services
npm run test:server:repositories

# Run specific file
npm test test/server/api/components.spec.ts

# Watch mode
npm run test:watch
```

## Best Practices

### 1. Test in Isolation

Each layer should test independently:
- API tests don't call services
- Service tests don't call repositories
- Repository tests don't include business logic

### 2. Mock Dependencies

Always mock the layer below:
- API tests mock services
- Service tests mock repositories
- Repository tests use real database

### 3. Use Descriptive Test Names

```typescript
// Yes Good
it('should return all components with correct count', async () => {})
it('should propagate repository errors', async () => {})

// No Bad
it('works', async () => {})
it('test findAll', async () => {})
```

### 4. Follow AAA Pattern

```typescript
it('should return all components with correct count', async () => {
  // Arrange
  vi.mocked(mockComponentRepo.findAll).mockResolvedValue(mockComponents)

  // Act
  const result = await componentService.findAll()

  // Assert
  expect(result.count).toBe(2)
})
```

### 5. Clean Up Test Data

Always clean up repository test data:

```typescript
beforeEach(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

afterAll(async () => {
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})
```

## Common Patterns

### Testing Error Handling

```typescript
it('should propagate repository errors', async () => {
  // Arrange
  const error = new Error('Database connection failed')
  vi.mocked(mockComponentRepo.findAll).mockRejectedValue(error)

  // Act & Assert
  await expect(componentService.findAll()).rejects.toThrow('Database connection failed')
})
```

### Testing Empty Results

```typescript
it('should return empty array when no components exist', async () => {
  // Arrange
  vi.mocked(mockComponentRepo.findAll).mockResolvedValue([])

  // Act
  const result = await componentService.findAll()

  // Assert
  expect(result.data).toEqual([])
  expect(result.count).toBe(0)
})
```

### Testing Data Transformation

```typescript
it('should calculate count correctly', async () => {
  // Arrange
  vi.mocked(mockComponentRepo.findAll).mockResolvedValue(mockComponents)

  // Act
  const result = await componentService.findAll()

  // Assert
  expect(result.count).toBe(mockComponents.length)
})
```

## Performance Targets

| Layer      | Target Speed | Acceptable Range |
|------------|--------------|------------------|
| API        | 10ms         | 5-20ms           |
| Service    | 10ms         | 5-20ms           |
| Repository | 50ms         | 30-100ms         |

## Related Documentation

- [Test README](../../test/README.md) - Complete testing overview
- [API Testing Guide](../../test/server/api/README.md) - Detailed API patterns
- [Test Isolation](./test-isolation.md) - Database isolation strategy
- [Service Layer Pattern](../architecture/service-layer-pattern.md) - Architecture overview

## Last Updated

2025-11-24 - Initial backend testing guide
