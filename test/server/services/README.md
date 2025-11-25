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
        count: 1
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
      expect(mockComponentRepo.findAll).toHaveBeenCalledTimes(1)
    })
  })
})
```

## Key Points

### 1. Mock the Repository

Always mock the repository layer:

```typescript
vi.mock('../../../server/repositories/component.repository')
```

### 2. Clear Mocks

Clear mocks before each test:

```typescript
beforeEach(() => {
  vi.clearAllMocks()
  componentService = new ComponentService()
  mockComponentRepo = componentService['componentRepo']
})
```

### 3. Test Business Logic

Focus on what the service does, not how data is retrieved:

```typescript
// Yes Good - tests count calculation
it('should calculate count correctly', async () => {
  vi.mocked(mockComponentRepo.findAll).mockResolvedValue(mockComponents)
  const result = await componentService.findAll()
  expect(result.count).toBe(mockComponents.length)
})

// No Bad - tests repository behavior
it('should call repository findAll', async () => {
  await componentService.findAll()
  expect(mockComponentRepo.findAll).toHaveBeenCalled()
})
```

### 4. Test Error Handling

Ensure errors propagate correctly:

```typescript
it('should propagate repository errors', async () => {
  const error = new Error('Database connection failed')
  vi.mocked(mockComponentRepo.findAll).mockRejectedValue(error)
  
  await expect(componentService.findAll()).rejects.toThrow('Database connection failed')
})
```

## Common Test Scenarios

### Success Case

```typescript
it('should return all components with correct count', async () => {
  vi.mocked(mockComponentRepo.findAll).mockResolvedValue(mockComponents)
  const result = await componentService.findAll()
  
  expect(result.data).toEqual(mockComponents)
  expect(result.count).toBe(mockComponents.length)
})
```

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

```bash
# Run all service tests
npm run test:server:services

# Run specific service test
npm test test/server/services/component.service.spec.ts

# Watch mode
npm run test:watch test/server/services
```

## Performance

Service tests should be **fast** (~10ms per test) since they don't touch the database.

If tests are slow:
- Yes Check that repository is properly mocked
- Yes Ensure no actual database calls
- Yes Verify no heavy computations in test setup

## Related Documentation

- [Backend Testing Guide](../../../docs/testing/backend-testing-guide.md) - Complete testing strategy
- [API Tests](../api/README.md) - API layer testing
- [Repository Tests](../repositories/README.md) - Repository layer testing
- [Service Layer Pattern](../../../docs/architecture/service-layer-pattern.md) - Architecture overview

## Examples

See these files for reference implementations:
- `component.service.spec.ts` - Complete example with multiple scenarios
- `team.service.spec.ts` - Service with business rules
- `system.service.spec.ts` - Service with multiple repositories
