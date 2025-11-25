# Testing Documentation

Complete guide to testing in the Polaris project.

## Overview

Polaris uses a **three-layer testing strategy** that mirrors the service layer architecture:

```
API Layer Tests → Service Layer Tests → Repository Layer Tests
     (Mock Service)    (Mock Repository)    (Use Test Database)
```

## Quick Start

Available test scripts are defined in `package.json`. Run `npm run` to list available scripts and execute the desired test script by name.

```bash
# List scripts
npm run

# Run the script from package.json, e.g.:
# npm run <script-name>
```

## Test runner

Vitest is the canonical test runner for this repository. All unit, service, and repository tests should be authored as plain Vitest specs (`.spec.ts`). Available test scripts are defined in `package.json`; run `npm run` to list scripts and execute the desired script by name. A Gherkin-style layer is available for high-level, business-facing feature tests: we integrate `vitest-cucumber` for those scenarios, but Gherkin is not required for unit or service tests. Use Gherkin feature files only when the scenario benefits from human-readable acceptance criteria or when testing cross-layer workflows.


## Documentation Index

### Core Guides

1. **[Backend Testing Guide](../../test/server/README.md)** ⭐
   - Complete guide to three-layer testing
   - Examples for each layer
   - Best practices and patterns
   - **Start here for backend testing**

2. **[Test Isolation](./test-isolation.md)**
   - Database isolation strategy
   - Test prefix patterns
   - Cleanup mechanisms
   - Neo4j Community Edition limitations

3. **[Database Cleanup](./database-cleanup.md)**
   - Cleanup utilities
   - Helper functions
   - Best practices

4. **[Coverage Configuration](./coverage-configuration.md)**
   - Test coverage setup
   - Coverage targets
   - Excluded files

### Layer-Specific Guides

1. **[API Tests](../../test/server/api/README.md)**
   - Mock service layer
   - Test HTTP contracts
   - Response structure validation
   - Error handling

2. **[Service Tests](../../test/server/services/README.md)**
   - Mock repository layer
   - Test business logic
   - Data transformation
   - Error propagation

3. **[Repository Tests](../../test/server/repositories/README.md)**
   - Use test database
   - Test queries and mapping
   - Test isolation with prefixes
   - Database operations

### Architecture

1. **[Service Layer Pattern](../architecture/service-layer-pattern.md)**
   - 3-layer architecture
   - Layer responsibilities
   - Testing strategy
   - Migration guide

## Testing Principles

### 1. Test in Isolation

Each layer tests independently:
- **API tests** don't call services
- **Service tests** don't call repositories
- **Repository tests** don't include business logic

### 2. Mock Dependencies

Always mock the layer below:
- **API tests** mock services
- **Service tests** mock repositories
- **Repository tests** use real database (with test prefixes)

### 3. Fast Execution

- **API tests**: ~10ms (no I/O)
- **Service tests**: ~10ms (no I/O)
- **Repository tests**: ~50-100ms (database I/O)

### 4. Clear Responsibilities

Each test layer has a specific focus:
- **API**: Response contracts
- **Service**: Business logic
- **Repository**: Data access

## Quick Reference

| Layer      | Location                    | Mocks      | Database | Speed      | Focus           |
|------------|-----------------------------|-----------|---------|-----------|--------------------|
| API        | `test/server/api/`          | Service   | No       | ~10ms     | HTTP contracts     |
| Service    | `test/server/services/`     | Repository| No       | ~10ms     | Business logic     |
| Repository | `test/server/repositories/` | None      | Yes       | ~50-100ms | Data queries       |

## Test Structure

```
test/
├── server/
│   ├── api/              # API endpoint tests
│   │   ├── README.md     # API testing guide
│   │   └── *.spec.ts     # API test files
│   ├── services/         # Service layer tests
│   │   ├── README.md     # Service testing guide
│   │   └── *.spec.ts     # Service test files
│   ├── repositories/     # Repository layer tests
│   │   ├── README.md     # Repository testing guide
│   │   └── *.spec.ts     # Repository test files
│   ├── integration/      # Complex workflows
│   └── utils/            # Utility tests
├── fixtures/             # Test helpers
│   ├── db-cleanup.ts     # Database cleanup utilities
│   └── api-client.ts     # API test helpers
└── setup/                # Global setup/teardown
    ├── global-setup.ts   # Runs before all tests
    └── global-teardown.ts # Runs after all tests
```

## Example: Testing a New Feature

When adding a new feature (e.g., "Tags"), create tests at all three layers:

### 1. Repository Test (`test/server/repositories/tag.repository.spec.ts`)

```typescript
import { TagRepository } from '../../../server/repositories/tag.repository'
import neo4j from 'neo4j-driver'

const TEST_PREFIX = 'test_tag_repo_'

describe('TagRepository', () => {
  it('should return all tags', async () => {
    // Create test data
    await session.run(`
      CREATE (t:Tag {name: $name})
    `, { name: `${TEST_PREFIX}urgent` })

    // Test repository
    const result = await tagRepo.findAll()
    expect(result.find(t => t.name === `${TEST_PREFIX}urgent`)).toBeDefined()
  })
})
```

### 2. Service Test (`test/server/services/tag.service.spec.ts`)

```typescript
import { TagService } from '../../../server/services/tag.service'
import { TagRepository } from '../../../server/repositories/tag.repository'

vi.mock('../../../server/repositories/tag.repository')

describe('TagService', () => {
  it('should return all tags with count', async () => {
    // Mock repository
    vi.mocked(mockTagRepo.findAll).mockResolvedValue(mockTags)

    // Test service
    const result = await tagService.findAll()
    expect(result.count).toBe(mockTags.length)
  })
})
```

### 3. API Test (`test/server/api/tags.spec.ts`)

```typescript
import { TagService } from '../../../server/services/tag.service'

vi.mock('../../../server/services/tag.service')

describe('Tags API', () => {
  it('should return tags with correct structure', async () => {
    // Mock service
    vi.mocked(TagService.prototype.findAll).mockResolvedValue({
      data: mockTags,
      count: 2
    })

    // Test API
    const responseData = {
      success: true,
      data: result.data,
      count: result.count
    }
    expect(responseData.success).toBe(true)
  })
})
```

## Common Patterns

### Testing Success Cases

```typescript
it('should return data with correct count', async () => {
  // Arrange
  vi.mocked(mockRepo.findAll).mockResolvedValue(mockData)

  // Act
  const result = await service.findAll()

  // Assert
  expect(result.data).toEqual(mockData)
  expect(result.count).toBe(mockData.length)
})
```

### Testing Error Handling

```typescript
it('should propagate errors', async () => {
  // Arrange
  const error = new Error('Database connection failed')
  vi.mocked(mockRepo.findAll).mockRejectedValue(error)

  // Act & Assert
  await expect(service.findAll()).rejects.toThrow('Database connection failed')
})
```

### Testing Empty Results

```typescript
it('should handle empty results', async () => {
  // Arrange
  vi.mocked(mockRepo.findAll).mockResolvedValue([])

  // Act
  const result = await service.findAll()

  // Assert
  expect(result.data).toEqual([])
  expect(result.count).toBe(0)
})
```

## Best Practices

### Yes DO

- Test each layer independently
- Mock dependencies at the layer below
- Use test prefixes for database tests
- Clean up test data after tests
- Follow AAA pattern (Arrange/Act/Assert)
- Use descriptive test names
- Test error cases
- Test edge cases (empty, null, etc.)

### No DON'T

- Test multiple layers in one test
- Make database calls in API/Service tests
- Include business logic in repository tests
- Use production data in tests
- Skip cleanup in repository tests
- Test implementation details
- Write tests that depend on each other

## Troubleshooting

### Tests Are Slow

- Yes Check mocks are properly configured
- Yes Verify no accidental database calls
- Yes Ensure minimal test data creation

### Tests Are Flaky

- Yes Check test isolation (prefixes)
- Yes Verify cleanup is working
- Yes Ensure tests don't depend on each other

### Database Tests Fail

- Yes Check Neo4j is running
- Yes Verify connection settings
- Yes Check test prefixes are correct
- Yes Run global setup to clean database

## Resources

### Internal Documentation

- [Backend Testing Guide](../../test/server/README.md) - Complete guide
- [Service Layer Pattern](../architecture/service-layer-pattern.md) - Architecture
- [Test Isolation](./test-isolation.md) - Database isolation

### External Resources

- [Vitest Documentation](https://vitest.dev/)
- [vitest-cucumber](https://vitest-cucumber.miceli.click/)
- [Neo4j Driver](https://neo4j.com/docs/javascript-manual/current/)

## Contributing

When adding new tests:

1. Follow the three-layer pattern
2. Add tests at all appropriate layers
3. Use proper mocking
4. Include error cases
5. Update documentation if needed

## Last Updated

2025-11-24 - Comprehensive testing documentation
