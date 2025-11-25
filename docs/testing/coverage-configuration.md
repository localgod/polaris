# Test Coverage Configuration

## Overview

The test suite is configured to measure coverage of the service and repository layers, which contain the core business logic and data access code.

## What's Covered

Coverage is collected from all source files except those explicitly excluded by Vitest's configuration.

### Excluded from Coverage

The project excludes a number of files and directories from coverage reporting (these globs come from `vitest.config.ts`):

- `node_modules/**`
- `dist/**`
- `.nuxt/**`
- `.output/**`
- `**/*.d.ts`
- `**/*.config.*`
- `**/mockData/**`
- `test/**`
- `app/pages/**`
- `app/components/**`
- `app/plugins/**`
- `server/api/**`
- `server/database/queries/**`
- `schema/scripts/**`
- `server/scripts/**`

These exclusions keep framework code, build artifacts, test code and non-TypeScript assets out of coverage calculations so the reports focus on application logic.

## Coverage Provider and Reports

Vitest is configured to use the V8 coverage provider. The test run generates multiple report formats: `text`, `html`, `json`, `lcov` and `json-summary`. Reports are written to `./coverage` by default (see `vitest.config.ts`).

## Coverage Thresholds

**No thresholds are currently enforced.** Coverage is collected and reported for informational purposes, but does not block CI/CD pipelines.

### Rationale

The current test suite contains a mix of integration and unit tests. Integration tests (API and E2E) exercise the whole stack while unit tests focus on services and repositories. Because some logic lives in integration flows, and because query files and front-end code are excluded from coverage, the overall percentage can be misleading.

### Future Considerations

As the test suite evolves, the project may add coverage thresholds. Example target ranges:

- **Lines**: 70-80%
- **Branches**: 60-70%
- **Functions**: 70-80%
- **Statements**: 70-80%

## Running Coverage

There are npm scripts for running tests and coverage. The canonical coverage command is:

```bash
npm run test:coverage
```

CI uses `npm run test:ci` (or layer-specific scripts) with the `--coverage` flag to generate coverage artifacts.

## Coverage Reports

The test run produces the following report formats:

- **Text** - Console output
- **HTML** - Interactive browser report (open `coverage/index.html`)
- **JSON** - Machine-readable data
- **LCOV** - For CI/CD integration
- **JSON Summary** - Quick overview

## CI/CD Integration

The GitHub Actions CI runs tests with the `--coverage` flag, uploads the generated `coverage/` directory as an artifact per test layer, then merges/aggregates those artifacts in a follow-up job. The repository also uses a Vitest coverage-report Action to post a coverage summary on pull requests.

## Best Practices

### Yes DO

- Write unit tests for services and repositories
- Test business logic thoroughly
- Use integration tests for API endpoints
- Aim for high coverage of critical paths
- Test error handling and edge cases

### No DON'T

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

Use the coverage script name in `package.json` and pass any runtime flags you need. Run `npm run` to find the script name and then execute it with flags, for example:

```bash
# List scripts
npm run

# Run coverage script with additional flags
# npm run <coverage-script> -- --include="server/services/**"
```

## Troubleshooting

### Low coverage despite many tests

- Check that tests are actually running (not skipped)
- Verify mocks are configured correctly
- Ensure test files match the `include` pattern

### Coverage not updating

- Clear coverage directory: `rm -rf coverage`
- Rebuild: `npm run build`
- Run tests again using the coverage script declared in `package.json` (run `npm run` to list scripts)

### Files not appearing in coverage

- Check `include` and `exclude` patterns in `vitest.config.ts`
- Verify file paths are correct
- Ensure files are TypeScript (`.ts`)

## See Also

- [Database Cleanup](./database-cleanup.md)
- [Test Architecture](../../CONTRIBUTING.md#testing)
- [Vitest Configuration](../../vitest.config.ts)
