# Test Documentation

This directory contains all tests for the Polaris application using [vitest-cucumber](https://vitest-cucumber.miceli.click/).

## Test Structure

The test directory is organized to mirror the source code architecture:

```
test/
├── server/                 # Backend tests (mirrors ./server)
│   ├── api/               # API endpoint tests (mock service layer)
│   ├── services/          # Service layer tests (mock repository layer)
│   ├── repositories/      # Repository layer tests (use test database)
│   ├── integration/       # Complex business workflows
│   └── utils/             # Server utility tests
├── app/                   # Frontend tests (mirrors ./app)
│   ├── e2e/              # E2E/UI tests
│   ├── components/       # Component tests (placeholder)
│   ├── composables/      # Composable tests (placeholder)
│   └── pages/            # Page tests (placeholder)
├── schema/                # Database schema tests
│   └── migrations/
├── fixtures/              # Shared test helpers
└── setup/                 # Global test setup/teardown

```

## Backend Testing Strategy

Polaris follows a **three-layer testing approach** that mirrors the service layer architecture:

### Layer 1: API Tests (`test/server/api/`)

**Purpose:** Test API contracts and response structures

**Approach:** Mock the service layer
- Yes Test HTTP response structure
- Yes Test required fields and types
- Yes Test error handling
- No No database calls
- No No business logic testing

**Example:**
```typescript
import { vi } from 'vitest'
import { ComponentService } from '../../../server/services/component.service'

vi.mock('../../../server/services/component.service')

// Mock service response
vi.mocked(ComponentService.prototype.findAll).mockResolvedValue({
  data: mockComponents,
  count: mockComponents.length
})

// Test API response structure
const responseData = {
  success: true,
  data: result.data,
  count: result.count
}
expect(responseData.success).toBe(true)
```

### Layer 2: Service Tests (`test/server/services/`)

**Purpose:** Test business logic and data transformation

**Approach:** Mock the repository layer
- Yes Test business rules
- Yes Test data transformation
- Yes Test error propagation
- Yes Test count calculation
- No No database calls
- No No API concerns

**Example:**
```typescript
import { vi } from 'vitest'
import { ComponentRepository } from '../../../server/repositories/component.repository'

vi.mock('../../../server/repositories/component.repository')

// Mock repository response
vi.mocked(ComponentRepository.prototype.findAll).mockResolvedValue(mockComponents)

// Test service logic
const result = await componentService.findAll()
expect(result.count).toBe(mockComponents.length)
```

### Layer 3: Repository Tests (`test/server/repositories/`)

**Purpose:** Test database queries and data mapping

**Approach:** Use test database with isolation
- Yes Test actual database queries
- Yes Test data mapping from Neo4j
- Yes Test query correctness
- Yes Use test data prefixes (`test_`)
- No No business logic
- No No API concerns

**Example:**
```typescript
import neo4j from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const TEST_PREFIX = 'test_component_repo_'
let driver: Driver

beforeEach(async () => {
  componentRepo = new ComponentRepository(driver)
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

// Create test data
await session.run(`
  CREATE (c:Component {
    name: $name,
    version: $version
  })
`, { name: `${TEST_PREFIX}react`, version: '18.2.0' })

// Test repository
const result = await componentRepo.findAll()
expect(result.find(c => c.name === `${TEST_PREFIX}react`)).toBeDefined()
```

## Testing Principles

### 1. Test Isolation

Each layer tests in isolation:
- **API tests** don't call services
- **Service tests** don't call repositories
- **Repository tests** don't include business logic

### 2. Mock Dependencies

Always mock the layer below:
- API tests mock services
- Service tests mock repositories
- Repository tests use real database (with test prefixes)

### 3. Fast Execution

- API tests: ~10ms (no I/O)
- Service tests: ~10ms (no I/O)
- Repository tests: ~50-100ms (database I/O)

### 4. Clear Responsibilities

Each test layer has a specific focus:
- **API:** Response contracts
- **Service:** Business logic
- **Repository:** Data access

## Quick Reference

| Layer      | Mocks      | Database | Speed  | Focus          |
|------------|-----------|----------|--------|----------------|
| API        | Service   | No        | Fast   | HTTP contracts |
| Service    | Repository| No        | Fast   | Business logic |
| Repository | None      | Yes        | Medium | Data queries   |

## Related Documentation

- [API Testing Guide](./server/api/README.md) - Detailed API testing patterns
- [Test Isolation](../docs/testing/test-isolation.md) - Database isolation strategy
- [Service Layer Pattern](../docs/architecture/service-layer-pattern.md) - Architecture overview

```

## Writing Tests with vitest-cucumber

### Basic Pattern

Every test file follows this pattern:

1. **Feature file** (`.feature`) - Gherkin scenarios
2. **Spec file** (`.spec.ts`) - Test implementation

**Example Feature File** (`test/api/example.feature`):
```gherkin
Feature: Example API
  As a developer
  I want to test the API
  So that I can ensure it works correctly

  Scenario: Get example data
    Given the API server is running
    When I request example data
    Then I should receive a successful response
```

**Example Spec File** (`test/api/example.spec.ts`):
```typescript
import { expect } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'

const feature = await loadFeature('./test/api/example.feature')

describeFeature(feature, ({ Scenario }) => {
  let response: any

  Scenario('Get example data', ({ Given, When, Then }) => {
    Given('the API server is running', () => {
      // Setup code
    })

    When('I request example data', async () => {
      response = await fetch('/api/example')
    })

    Then('I should receive a successful response', () => {
      expect(response.ok).toBe(true)
    })
  })
})
```

### Using Background Steps

Background steps run before EACH scenario. They're perfect for common setup.

**Feature File with Background**:
```gherkin
Feature: User Management
  As a system
  I want to manage users
  So that authentication works

  Background:
    Given the database is initialized
    And test data is loaded

  Scenario: Create user
    When I create a new user
    Then the user should exist

  Scenario: Delete user
    When I delete a user
    Then the user should not exist
```

**Spec File with Background**:
```typescript
import { expect, beforeAll } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'

const feature = await loadFeature('./test/api/users.feature')

// Use beforeAll for one-time setup (outside describeFeature)
let dbConnection: any

beforeAll(async () => {
  dbConnection = await connectToDatabase()
})

describeFeature(feature, ({ Background, Scenario }) => {
  let testData: any

  // Background runs before EACH scenario
  Background(({ Given, And }) => {
    Given('the database is initialized', () => {
      // This runs before each scenario
      expect(dbConnection).toBeDefined()
    })

    And('test data is loaded', () => {
      testData = loadTestData()
    })
  })

  Scenario('Create user', ({ When, Then }) => {
    // Background already ran
    When('I create a new user', () => {
      // Test code
    })

    Then('the user should exist', () => {
      // Assertions
    })
  })

  Scenario('Delete user', ({ When, Then }) => {
    // Background runs again before this scenario
    When('I delete a user', () => {
      // Test code
    })

    Then('the user should not exist', () => {
      // Assertions
    })
  })
})
```

### Important: Background vs beforeAll

- **Background**: Runs before EACH scenario (defined in feature file)
- **beforeAll**: Runs ONCE before all scenarios (Vitest hook, outside describeFeature)

```typescript
// Yes CORRECT
let serverRunning = false

beforeAll(async () => {
  // Runs ONCE - expensive setup
  serverRunning = await checkServerHealth()
})

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    // Runs BEFORE EACH scenario - quick setup
    Given('the server is running', () => {
      expect(serverRunning).toBe(true)
    })
  })
})

// No WRONG - Don't put beforeAll inside describeFeature
describeFeature(feature, ({ Background, Scenario }) => {
  beforeAll(async () => {  // This will cause issues!
    // ...
  })
})
```

### Conditional Test Skipping

For tests that require external services (server, database):

```typescript
let serverRunning = false

beforeAll(async () => {
  serverRunning = await checkServerHealth()
  if (!serverRunning) {
    console.warn('\n⚠️  Server not running. Tests will be skipped.\n')
  }
})

describeFeature(feature, ({ Scenario }) => {
  Scenario('Test requiring server', ({ Given, When, Then }) => {
    Given('the server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return  // Skip this scenario
      }
      expect(serverRunning).toBe(true)
    })

    When('I make a request', async () => {
      if (!serverRunning) return  // Skip
      // Test code
    })

    Then('I should get a response', () => {
      if (!serverRunning) return  // Skip
      // Assertions
    })
  })
})
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test test/api/example.spec.ts

# Run tests by category
npm run test:api      # API tests
npm run test:model    # Model tests
npm run test:ui       # UI tests

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Test Categories

Tests are organized by category using tags in feature files:

- `@api` - API integration tests (require server)
- `@model` - Database/model tests (require Neo4j)
- `@ui` - UI/E2E tests (require server + browser)
- `@unit` - Unit tests (no external dependencies)
- `@integration` - Integration tests
- `@smoke` - Smoke tests (quick sanity checks)

## Best Practices

### 1. Feature Files

- Yes Use clear, business-focused language
- Yes One feature per file
- Yes Use Background for common setup
- Yes Keep scenarios focused and independent
- No Don't include implementation details

### 2. Spec Files

- Yes Match scenario names exactly
- Yes Implement all steps from feature file
- Yes Use Background for repeated setup
- Yes Keep step implementations simple
- No Don't skip scenarios without good reason

### 3. Step Definitions

- Yes Given: Setup/preconditions
- Yes When: Actions/events
- Yes Then: Assertions/outcomes
- Yes And/But: Additional steps of same type

### 4. Shared State

```typescript
// Yes GOOD - Shared state in closure
describeFeature(feature, ({ Scenario }) => {
  let sharedData: any  // Accessible to all scenarios

  Scenario('First scenario', ({ Given, When, Then }) => {
    When('I create data', () => {
      sharedData = { id: 1 }
    })
  })

  Scenario('Second scenario', ({ Given, When, Then }) => {
    Given('data exists', () => {
      expect(sharedData).toBeDefined()
    })
  })
})
```

## Troubleshooting

### "StepAbleUnknowStepError: ... does not exist"

This means a step in your feature file isn't implemented in the spec file.

**Solution**: Implement the missing step or check for typos.

### "Background step not found"

Background steps must be implemented using the `Background` function:

```typescript
// No WRONG
Scenario('Test', ({ Given }) => {
  Given('background step', () => {})  // Don't implement Background steps here
})

// Yes CORRECT
Background(({ Given }) => {
  Given('background step', () => {})  // Implement Background steps here
})
```

### Tests timing out

- Check if external services (server, database) are running
- Add timeouts to network requests
- Use conditional skipping for optional services

### Feature file not found

Ensure the path in `loadFeature()` is correct:

```typescript
// Relative to project root
const feature = await loadFeature('./test/api/example.feature')
```

## Migration from Custom Gherkin Helper

If you're migrating from the old custom Gherkin helper:

**Before**:
```typescript
import { Feature } from '../helpers/gherkin'

Feature('Example @api', ({ Scenario }) => {
  // ...
})
```

**After**:
```typescript
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'

const feature = await loadFeature('./test/api/example.feature')

describeFeature(feature, ({ Scenario }) => {
  // ...
})
```

## Resources

- [vitest-cucumber Documentation](https://vitest-cucumber.miceli.click/)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [Vitest Documentation](https://vitest.dev/)

## Working with Data Tables

Gherkin data tables provide a way to pass structured data to test steps. This project includes a comprehensive data table parser utility to handle various table formats.

### Using the Data Table Parser

**Import the parser:**
```typescript
import { parseDataTable, parseDataTableAsObject } from '../helpers/data-table-parser'
```

### Example 1: Multi-Row Data Tables

**Feature file:**
```gherkin
Given the following teams exist:
  | name           | email                    |
  | Backend Team   | backend@example.com      |
  | Frontend Team  | frontend@example.com     |
```

**Spec file:**
```typescript
Given('the following teams exist:', async (dataTable: string) => {
  const teams = parseDataTable(dataTable)
  // teams = [
  //   { name: 'Backend Team', email: 'backend@example.com' },
  //   { name: 'Frontend Team', email: 'frontend@example.com' }
  // ]
  
  for (const team of teams) {
    await session.run(`
      CREATE (t:Team {name: $name, email: $email})
    `, team)
  }
})
```

### Example 2: Key-Value Data Tables

**Feature file:**
```gherkin
When I create an audit log with:
  | field      | value       |
  | operation  | CREATE      |
  | entityType | Technology  |
  | userId     | user123     |
```

**Spec file:**
```typescript
When('I create an audit log with:', async (dataTable: string) => {
  const data = parseDataTableAsObject(dataTable)
  // data = { operation: 'CREATE', entityType: 'Technology', userId: 'user123' }
  
  await session.run(`
    CREATE (a:AuditLog {
      operation: $operation,
      entityType: $entityType,
      userId: $userId,
      timestamp: datetime()
    })
  `, data)
})
```

### Example 3: Single-Row Configuration

**Feature file:**
```gherkin
Given the "Backend Team" approves "Java" with:
  | status   | versionConstraint |
  | approved | >=17              |
```

**Spec file:**
```typescript
import { parseDataTableAsFirstRow } from '../helpers/data-table-parser'

Given('the "Backend Team" approves "Java" with:', async (dataTable: string) => {
  const config = parseDataTableAsFirstRow(dataTable)
  // config = { status: 'approved', versionConstraint: '>=17' }
  
  await session.run(`
    MATCH (team:Team {name: 'Backend Team'})
    MATCH (tech:Technology {name: 'Java'})
    CREATE (team)-[:APPROVES {
      status: $status,
      versionConstraint: $versionConstraint
    }]->(tech)
  `, config)
})
```

### Available Parser Functions

- **`parseDataTable(tableString)`** - Returns array of row objects
- **`parseDataTableAsObject(tableString)`** - Converts field/value table to single object
- **`parseDataTableAsFirstRow(tableString)`** - Returns first row as object
- **`parseDataTableAuto(tableString)`** - Auto-detects format and parses accordingly
- **`createDataTableStep(handler)`** - Helper to create step handlers
- **`createDataTableObjectStep(handler)`** - Helper for object-based steps

### Best Practices for Data Tables

1. **Use appropriate parser** - Choose the parser that matches your data structure
2. **Validate data** - Check that required fields are present before using
3. **Handle empty tables** - All parsers return empty arrays/objects for invalid input
4. **Type safety** - Define interfaces for your data structures
5. **Reusable steps** - Create helper functions for common data table patterns

### Complete Example with Background

```typescript
import { parseDataTable, parseDataTableAsObject } from '../helpers/data-table-parser'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'

const feature = await loadFeature('./test/model/features/example.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let teams: Array<{ name: string; email: string }>
  let session: Session

  Background(({ Given, And }) => {
    Given('a Neo4j database is available', () => {
      expect(driver).toBeDefined()
    })

    And('the following teams exist:', async (dataTable: string) => {
      teams = parseDataTable(dataTable)
      session = driver.session()
      
      for (const team of teams) {
        await session.run(`
          CREATE (t:Team {name: $name, email: $email})
        `, team)
      }
    })
  })

  Scenario('Test with background data', ({ When, Then }) => {
    When('I query teams', async () => {
      // Teams are already created in Background
      const result = await session.run('MATCH (t:Team) RETURN t')
      expect(result.records.length).toBeGreaterThan(0)
    })

    Then('all teams should exist', () => {
      expect(teams.length).toBeGreaterThan(0)
    })
  })
})
```

For more examples, see:
- `test/helpers/data-table-parser.spec.ts` - Comprehensive unit tests
- `test/model/usage-tracking.spec.ts` - Real-world usage examples
