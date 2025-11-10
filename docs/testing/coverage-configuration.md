# Test Coverage Configuration

## Overview

The test suite is configured to measure coverage of the service and repository layers, which contain the core business logic and data access code.

## What's Covered

Coverage is collected from all source files except those explicitly excluded.

### ❌ Excluded from Coverage

- **API Endpoints** (`server/api/**`) - Thin HTTP handlers tested via integration tests
- **Query Files** (`server/database/queries/**`) - Cypher files tested via repository tests
- **Frontend** (`app/**`) - Vue components tested separately
- **Configuration** (`**/*.config.*`) - Configuration files
- **Type Definitions** (`**/*.d.ts`) - TypeScript declarations
- **Test Files** (`test/**`) - Test code itself
- **Build Artifacts** (`.nuxt/**`, `.output/**`, `dist/**`)

## Rationale

### Why Exclude API Endpoints?

API endpoints are thin HTTP handlers that:
- Parse request parameters
- Call service methods
- Format responses
- Handle HTTP errors

They are thoroughly tested via **integration tests** that verify the entire request/response cycle. Measuring line coverage of these files would be misleading because:
- Most logic is in services (which ARE covered)
- HTTP handling code is framework-specific
- Integration tests provide better confidence

### Why Exclude Query Files?

Cypher query files (`.cypher`) are:
- Tested indirectly via repository tests
- Not executable TypeScript code
- Version-controlled and reviewed
- Validated by Neo4j at runtime

Repository tests verify that queries execute correctly and return expected results.

## Coverage Thresholds

**No thresholds are currently enforced.** Coverage is collected and reported for informational purposes, but does not block CI/CD pipelines.

### Rationale

The current test suite focuses on:
- **Integration tests** - Testing full request/response cycles
- **Model tests** - Testing database schema and relationships
- **UI tests** - Testing user workflows

These tests provide high confidence in system behavior but don't directly exercise service/repository code in isolation, resulting in low coverage percentages.

### Future Considerations

As the test suite evolves to include more unit tests of service and repository layers, coverage thresholds may be introduced:

- **Lines**: 70-80%
- **Branches**: 60-70%
- **Functions**: 70-80%
- **Statements**: 70-80%

## Running Coverage

```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html

# View summary
npm run test:coverage -- --reporter=text
```

## Coverage Reports

The test suite generates multiple report formats:

- **Text** - Console output
- **HTML** - Interactive browser report
- **JSON** - Machine-readable data
- **LCOV** - For CI/CD integration
- **JSON Summary** - Quick overview

## CI/CD Integration

Coverage reports are automatically:
- Generated on every test run
- Uploaded to GitHub Actions artifacts
- Commented on pull requests
- Tracked over time

## Best Practices

### ✅ DO

- Write unit tests for services and repositories
- Test business logic thoroughly
- Use integration tests for API endpoints
- Aim for high coverage of critical paths
- Test error handling and edge cases

### ❌ DON'T

- Chase 100% coverage
- Test framework code
- Test configuration files
- Write tests just for coverage
- Ignore integration tests

## Example: Testing the Layers

### Service Layer (Unit Test)

```typescript
import { vi } from 'vitest'
import { TeamService } from '../server/services/team.service'
import { TeamRepository } from '../server/repositories/team.repository'

vi.mock('../server/repositories/team.repository')

test('service applies business logic', async () => {
  const mockRepo = new TeamRepository()
  vi.spyOn(mockRepo, 'findAll').mockResolvedValue([
    { name: 'team1', systemCount: 5 },
    { name: 'team2', systemCount: 3 }
  ])
  
  const service = new TeamService()
  const result = await service.findAll()
  
  expect(result.count).toBe(2)
  expect(result.data).toHaveLength(2)
})
```

### Repository Layer (Integration Test)

```typescript
import { TeamRepository } from '../server/repositories/team.repository'

test('repository fetches data correctly', async () => {
  const repo = new TeamRepository()
  const teams = await repo.findAll()
  
  expect(teams).toBeInstanceOf(Array)
  expect(teams[0]).toHaveProperty('name')
  expect(teams[0]).toHaveProperty('systemCount')
})
```

### API Layer (Integration Test)

```typescript
import { apiGet } from '../helpers/api-client'

test('API endpoint returns correct format', async () => {
  const response = await apiGet('/api/teams')
  
  expect(response.success).toBe(true)
  expect(response.data).toBeInstanceOf(Array)
  expect(response.count).toBeGreaterThanOrEqual(0)
})
```

## Viewing Coverage by Layer

```bash
# Services only
npm run test:coverage -- --include="server/services/**"

# Repositories only
npm run test:coverage -- --include="server/repositories/**"

# Specific file
npm run test:coverage -- --include="server/services/team.service.ts"
```

## Troubleshooting

### Low coverage despite many tests

- Check that tests are actually running (not skipped)
- Verify mocks are configured correctly
- Ensure test files match the `include` pattern

### Coverage not updating

- Clear coverage directory: `rm -rf coverage`
- Rebuild: `npm run build`
- Run tests again: `npm run test:coverage`

### Files not appearing in coverage

- Check `include` and `exclude` patterns in `vitest.config.ts`
- Verify file paths are correct
- Ensure files are TypeScript (`.ts`)

## See Also

- [Database Cleanup](./database-cleanup.md)
- [Test Architecture](../../CONTRIBUTING.md#testing)
- [Vitest Configuration](../../vitest.config.ts)
