# Test Documentation

This directory contains all tests for the Polaris application using [vitest-cucumber](https://vitest-cucumber.miceli.click/).

## Test Structure

```
test/
├── api/                    # API integration tests
│   ├── *.feature          # Gherkin feature files
│   └── *.spec.ts          # Test implementations
├── helpers/               # Helper/utility tests
│   ├── *.feature          # Gherkin feature files
│   └── *.spec.ts          # Test implementations
├── model/                 # Model/database tests
│   ├── features/          # Gherkin feature files
│   └── *.spec.ts          # Test implementations
├── ui/                    # UI/E2E tests
│   ├── *.feature          # Gherkin feature files
│   └── *.spec.ts          # Test implementations
└── setup/                 # Global test setup/teardown

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
// ✅ CORRECT
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

// ❌ WRONG - Don't put beforeAll inside describeFeature
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

- ✅ Use clear, business-focused language
- ✅ One feature per file
- ✅ Use Background for common setup
- ✅ Keep scenarios focused and independent
- ❌ Don't include implementation details

### 2. Spec Files

- ✅ Match scenario names exactly
- ✅ Implement all steps from feature file
- ✅ Use Background for repeated setup
- ✅ Keep step implementations simple
- ❌ Don't skip scenarios without good reason

### 3. Step Definitions

- ✅ Given: Setup/preconditions
- ✅ When: Actions/events
- ✅ Then: Assertions/outcomes
- ✅ And/But: Additional steps of same type

### 4. Shared State

```typescript
// ✅ GOOD - Shared state in closure
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
// ❌ WRONG
Scenario('Test', ({ Given }) => {
  Given('background step', () => {})  // Don't implement Background steps here
})

// ✅ CORRECT
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
