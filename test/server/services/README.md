# Service Layer Tests

This directory contains tests for the service layer, which handles business logic and data transformation.

## Purpose

Test business logic, data transformation, and orchestration between repositories **without** database dependencies.

## Approach

**Mock the repository layer** - Focus on business rules, not data access.

## What to Test

- Yes Business rules and validation
- Yes Data transformation logic
- Yes Count calculation
- Yes Error propagation from repository
- Yes Multiple repository orchestration
- No HTTP concerns (tested in API layer)
- No Database queries (tested in repository layer)

## Test Pattern

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
      cpe: null,
      bomRef: null,
      type: 'library',
      group: null,
      scope: 'required',
      hashes: [],
      licenses: [],
      copyright: null,
      supplier: null,
      author: null,
      publisher: null,
      homepage: 'https://reactjs.org',
      externalReferences: [],
      description: 'React library',
      releaseDate: null,
      publishedDate: null,
      modifiedDate: null,
      technologyName: 'React',
      systemCount: 5,
      vulnerabilityCount: 0

    ## Key points (service layer)

    This file contains service-layer-specific patterns and examples. For general testing rules, scripts, and the three-layer strategy see `../README.md`.

    - Mock the repository layer: `vi.mock('../../../server/repositories/component.repository')`.
    - Keep service tests focused on business rules and data transformation; do not call the database.
    - Use `beforeEach(() => vi.clearAllMocks())` to ensure test isolation.

    ### Common scenarios

    - Success case: mock repositories to return domain objects and assert the service returns `{ data, count }`.
    - Empty results: mock repo to return [] and assert count is 0.
    - Error propagation: mock repo method to reject and assert service propagates or handles the error as intended.

    ### Examples

    See the examples in this file for concrete spec patterns. For repository-level examples and cleanup patterns, see `../repositories/README.md`.

    ## Related Documentation

    - [Server test overview](../README.md) - Canonical server testing overview
    - [API Tests](../api/README.md) - API layer testing
    - [Repository Tests](../repositories/README.md) - Repository layer testing

### Empty Results

```typescript
it('should return empty array when no components exist', async () => {
  vi.mocked(mockComponentRepo.findAll).mockResolvedValue([])
  const result = await componentService.findAll()
  
  expect(result.data).toEqual([])
  expect(result.count).toBe(0)
})
```

### Error Propagation

```typescript
it('should propagate repository errors', async () => {
  const error = new Error('Database connection failed')
  vi.mocked(mockComponentRepo.findAll).mockRejectedValue(error)
  
  await expect(componentService.findAll()).rejects.toThrow('Database connection failed')
})
```

### Data Transformation

```typescript
it('should transform data correctly', async () => {
  const rawData = [/* raw repository data */]
  vi.mocked(mockComponentRepo.findAll).mockResolvedValue(rawData)
  
  const result = await componentService.findAll()
  
  // Assert transformed data
  expect(result.data[0]).toHaveProperty('transformedField')
})
```

## Running Tests

Available test scripts are defined in `package.json`. Run `npm run` to list scripts, then run the desired script by name. For example:

```bash
# List scripts
npm run

# Run the script from package.json, e.g.:
# npm run <script-name>
```

## Performance

Service tests should be **fast** (~10ms per test) since they don't touch the database.

If tests are slow:
- Yes Check that repository is properly mocked
- Yes Ensure no actual database calls
- Yes Verify no heavy computations in test setup

## Related Documentation

- [Backend Testing Guide](../README.md) - Complete testing strategy
- [API Tests](../api/README.md) - API layer testing
- [Repository Tests](../repositories/README.md) - Repository layer testing
- [Service Layer Pattern](../../../docs/architecture/service-layer-pattern.md) - Architecture overview

## Examples

See these files for reference implementations:
- `component.service.spec.ts` - Complete example with multiple scenarios
- `team.service.spec.ts` - Service with business rules
- `system.service.spec.ts` - Service with multiple repositories
