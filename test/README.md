# Test Directory Structure

This directory contains all tests for the Polaris project, organized to mirror the source code architecture and clearly separate test types.

## Directory Structure

```
test/
├── README.md                          # This file - testing strategy guide
├── setup/                             # Global test setup
│   ├── global-setup.ts
│   └── global-teardown.ts
├── fixtures/                          # Shared test fixtures and helpers
│   ├── api-client.ts                 # HTTP client for API tests
│   ├── db-cleanup.ts                 # Database cleanup utilities
│   └── gherkin.ts                    # Gherkin/BDD test helpers
│
├── server/                            # Backend tests (mirrors ./server)
│   ├── api/                          # API endpoint integration tests (Gherkin)
│   │   ├── api-health.{feature,spec.ts}
│   │   ├── systems.{feature,spec.ts}
│   │   ├── teams.spec.ts
│   │   ├── sboms-integration.{feature,spec.ts}
│   │   └── unmapped-components.{feature,spec.ts}
│   │
│   ├── services/                     # Service layer unit tests (Standard Vitest)
│   │   ├── system.service.spec.ts
│   │   ├── team.service.spec.ts
│   │   ├── token.service.spec.ts
│   │   ├── component.service.spec.ts
│   │   └── technology.service.spec.ts
│   │
│   ├── repositories/                 # Repository unit tests (Standard Vitest)
│   │   ├── system.repository.spec.ts
│   │   ├── team.repository.spec.ts
│   │   └── component.repository.spec.ts
│   │
│   ├── utils/                        # Server utility tests (Standard Vitest)
│   │   ├── sbom-validator.spec.ts
│   │   ├── sbom-request-validator.spec.ts
│   │   └── sbom-request-validation.feature
│   │
│   └── integration/                  # Complex business workflows (Gherkin)
│       ├── usage-tracking.{feature,spec.ts}
│       ├── policy-enforcement.{feature,spec.ts}
│       ├── audit-trail.{feature,spec.ts}
│       ├── approval-resolution.{feature,spec.ts}
│       ├── team-technology-approvals.{feature,spec.ts}
│       ├── version-specific-approvals.{feature,spec.ts}
│       └── features/
│           ├── usage-tracking.feature
│           ├── policy-enforcement.feature
│           ├── audit-trail.feature
│           ├── approval-resolution.feature
│           ├── team-technology-approvals.feature
│           └── version-specific-approvals.feature
│
├── app/                               # Frontend tests (mirrors ./app)
│   ├── components/                   # Vue component tests
│   ├── composables/                  # Composable unit tests
│   ├── pages/                        # Page component tests
│   └── e2e/                          # E2E/UI tests (Playwright + Gherkin)
│       ├── homepage.{feature,spec.ts}
│       └── setup.ts
│
├── schema/                            # Database schema tests
│   └── migrations/
│       └── migration-runner.spec.ts
│
├── examples/                          # Example tests and patterns
│   └── proper-cleanup.spec.ts
│
└── helpers/                           # Legacy helpers (being phased out)
```

## Testing Strategy

### Hybrid Testing Approach

We use a **hybrid testing strategy** that combines two testing styles based on the test's purpose:

#### Use Gherkin/BDD (Feature files + spec files) for

✅ **API endpoint integration tests** (`test/server/api/`)
- Documents API contracts in human-readable format
- Serves as living documentation for API consumers
- Example: `systems.feature` + `systems.spec.ts`

✅ **Complex business workflows** (`test/server/integration/`)
- Multi-step business processes
- Approval resolution logic
- Policy enforcement
- Audit trail verification
- Example: `approval-resolution.feature` + `approval-resolution.spec.ts`

✅ **E2E/UI tests** (`test/app/e2e/`)
- User journey testing
- Cross-browser compatibility
- Example: `homepage.feature` + `homepage.spec.ts`

#### Use Standard Vitest for

✅ **Service layer unit tests** (`test/server/services/`)
- Business logic validation
- Input validation
- Error handling
- Fast, focused tests
- Example: `system.service.spec.ts`

✅ **Repository layer unit tests** (`test/server/repositories/`)
- Data access patterns
- Query logic
- Mocked database interactions
- Example: `system.repository.spec.ts`

✅ **Utility/Helper functions** (`test/server/utils/`)
- Pure functions
- Data transformations
- Validation logic
- Example: `sbom-validator.spec.ts`

✅ **Component unit tests** (`test/app/components/`, `test/app/composables/`)
- Vue component behavior
- Composable logic
- Props and events

## Test Organization Rules

### Where to Place New Tests

Use this decision tree when adding new tests:

1. **Is it an API endpoint test?**
   - Yes → `test/server/api/` (use Gherkin)
   - No → Continue

2. **Is it a complex business workflow?**
   - Yes → `test/server/integration/` (use Gherkin)
   - No → Continue

3. **Is it a service layer test?**
   - Yes → `test/server/services/` (use Standard Vitest)
   - No → Continue

4. **Is it a repository layer test?**
   - Yes → `test/server/repositories/` (use Standard Vitest)
   - No → Continue

5. **Is it a utility/helper test?**
   - Yes → `test/server/utils/` (use Standard Vitest)
   - No → Continue

6. **Is it a frontend component/composable test?**
   - Yes → `test/app/components/` or `test/app/composables/` (use Standard Vitest)
   - No → Continue

7. **Is it an E2E/UI test?**
   - Yes → `test/app/e2e/` (use Gherkin)
   - No → Ask for guidance

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests by Category

```bash
# Backend tests
npm run test:server

# API integration tests
npm run test:server:api

# Service unit tests
npm run test:server:services

# Repository unit tests
npm run test:server:repositories

# Integration tests
npm run test:server:integration

# Utility tests
npm run test:server:utils

# Frontend tests
npm run test:app

# E2E tests
npm run test:app:e2e

# Schema tests
npm run test:schema
```

### Run Tests by Type

```bash
# All unit tests (services, repositories, utils, components, composables)
npm run test:unit

# All integration tests (API, integration workflows, E2E)
npm run test:integration

# Smoke tests only
npm run test:smoke
```

### Development Workflow

```bash
# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Interactive UI
npm run test:vitest-ui
```

## Test Patterns

### Service Layer Tests

Service tests should mock repository dependencies and focus on business logic:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SystemService } from '../../../server/services/system.service'
import { SystemRepository } from '../../../server/repositories/system.repository'

vi.mock('../../../server/repositories/system.repository')

describe('SystemService', () => {
  let service: SystemService
  let mockRepo: any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SystemService()
    mockRepo = vi.mocked(SystemRepository.prototype)
  })

  it('should validate business rules', async () => {
    // Test business logic
  })
})
```

### Repository Layer Tests

Repository tests should mock database interactions:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SystemRepository } from '../../../server/repositories/system.repository'

vi.mock('../../../server/repositories/base.repository', () => ({
  BaseRepository: class {
    executeQuery = vi.fn()
  }
}))

describe('SystemRepository', () => {
  let repository: SystemRepository
  let mockExecuteQuery: any

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SystemRepository()
    mockExecuteQuery = vi.spyOn(repository as any, 'executeQuery')
  })

  it('should query database correctly', async () => {
    // Test data access
  })
})
```

### API Integration Tests (Gherkin)

API tests use Gherkin for documentation and standard Vitest for implementation:

```typescript
import { Feature } from '../../fixtures/gherkin'
import { apiGet, checkServerHealth } from '../../fixtures/api-client'

Feature('Systems API @api @integration', ({ Scenario }) => {
  Scenario('Retrieve list of systems', ({ Given, When, Then, And }) => {
    Given('the API server is running', () => {
      // Setup
    })

    When('I request the systems endpoint', async () => {
      // Action
    })

    Then('I should receive a list of systems', () => {
      // Assertion
    })
  })
})
```

## Test Tags

Use tags to categorize tests:

- `@api` - API endpoint tests
- `@integration` - Integration tests
- `@unit` - Unit tests
- `@smoke` - Critical smoke tests
- `@e2e` - End-to-end tests

Example:
```typescript
Feature('Systems API @api @integration @smoke', ({ Scenario }) => {
  // Test scenarios
})
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Naming**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, action, and assertion phases
4. **Mock External Dependencies**: Mock database, API calls, and external services
5. **Test Edge Cases**: Include tests for error conditions and boundary cases
6. **Keep Tests Fast**: Unit tests should run in milliseconds
7. **Use Fixtures**: Share common test data and setup in the `fixtures/` directory
8. **Clean Up**: Always clean up resources (database, files, etc.) after tests

## Migration from Old Structure

The test directory was restructured to improve organization and clarity. The old structure was:

```
test/
├── api/          → test/server/api/
├── model/        → test/server/integration/ and test/schema/migrations/
├── helpers/      → test/fixtures/ and test/server/utils/
└── ui/           → test/app/e2e/
```

All import paths have been updated to reflect the new structure.

## Contributing

When adding new tests:

1. Follow the directory structure and naming conventions
2. Use the appropriate testing style (Gherkin vs Standard Vitest)
3. Add appropriate test tags
4. Update this README if adding new test categories
5. Ensure all tests pass before committing
6. Run linting: `npm run lint`
7. Run markdown linting: `npm run mdlint`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Gherkin Syntax](https://cucumber.io/docs/gherkin/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
