# API Integration Tests

This directory contains integration tests for API endpoints using Gherkin/BDD style testing.

## Overview

API tests verify that endpoints return correct responses with proper structure and error handling. These tests **mock the service layer** to avoid database dependencies and focus on API contract testing.

## Test Pattern

### 1. Feature File (`.feature`)

Define test scenarios in Gherkin syntax:

```gherkin
Feature: Components API
  As a client application
  I want to retrieve component data via the API
  So that I can display SBOM information to users

  Background:
    Given the API server is running

  @api
  Scenario: Successfully retrieve all components
    When I request GET "/api/components"
    Then the response status should be 200
    And the response should have property "success" equal to true
    And the response should have property "data" as an array
    And the response should have property "count" as a number
```

### 2. Spec File (`.spec.ts`)

Implement scenarios with mocked services:

```typescript
import { expect, beforeEach, vi } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import type { ApiResponse, YourType } from '~~/types/api'
import { YourService } from '../../../server/services/your.service'

// Mock the service layer
vi.mock('../../../server/services/your.service')

const mockData: YourType[] = [
  // Your mock data here
]

beforeEach(() => {
  vi.clearAllMocks()
})

const feature = await loadFeature('./test/server/api/your-endpoint.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let responseData: ApiResponse<YourType>

  Background(({ Given }) => {
    Given('the API server is running', () => {
      expect(true).toBe(true)
    })
  })

  Scenario('Successfully retrieve data', ({ When, Then, And }) => {
    When('I request GET "/api/your-endpoint"', async () => {
      // Mock successful service response
      vi.mocked(YourService.prototype.findAll).mockResolvedValue({
        data: mockData,
        count: mockData.length
      })

      // Simulate API endpoint logic
      const service = new YourService()
      const result = await service.findAll()
      
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
  })
})
```

## Key Principles

### Yes DO

- **Mock the service layer** - Use `vi.mock()` to mock service classes
- **Test API contracts** - Verify response structure, types, and required fields
- **Test error handling** - Mock service errors to test error responses
- **Keep tests fast** - No database calls, no network requests
- **Clear mocks** - Use `beforeEach(() => vi.clearAllMocks())` for test isolation
- **Follow Gherkin syntax** - Use Given/When/Then pattern consistently

### No DON'T

- **Don't call the database** - Mock services instead
- **Don't test business logic** - That belongs in service/repository tests
- **Don't make real HTTP requests** - Simulate endpoint logic directly
- **Don't test implementation details** - Focus on API contract

## Test Scenarios to Cover

For each API endpoint, test:

1. **Success case** - Valid request returns expected structure
2. **Required fields** - Response includes all mandatory properties
3. **Empty results** - Endpoint handles empty data gracefully
4. **Error handling** - Service errors return proper error response

## Example: Error Handling Test

```typescript
Scenario('API handles database errors gracefully', ({ Given, When, Then, And }) => {
  Given('the database connection fails', () => {
    expect(true).toBe(true)
  })

  When('I request GET "/api/components"', async () => {
    // Mock service throwing an error
    vi.mocked(ComponentService.prototype.findAll).mockRejectedValue(
      new Error('Database connection failed')
    )

    // Simulate API endpoint error handling
    try {
      const componentService = new ComponentService()
      const result = await componentService.findAll()
      
      responseData = {
        success: true,
        data: result.data,
        count: result.count
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch'
      responseData = {
        success: false,
        error: errorMessage,
        data: []
      }
    }
  })

  Then('the response status should be 200', () => {
    expect(responseData).toBeDefined()
  })

  And('if success is false, response should have property "error" as a string', () => {
    if (!responseData.success) {
      expect(typeof responseData.error).toBe('string')
    }
  })
})
```

## Running Tests

```bash
# Run all API tests
npm run test:server:api

# Run specific test file
npm test test/server/api/components.spec.ts

# Watch mode
npm run test:watch test/server/api
```

## Mock Data Best Practices

1. **Create realistic mock data** - Include all required fields
2. **Use TypeScript types** - Ensure mocks match actual types
3. **Keep mocks minimal** - Only include data needed for tests
4. **Reuse mock data** - Define once, use across scenarios

```typescript
const mockComponents: Component[] = [
  {
    name: 'react',
    version: '18.2.0',
    packageManager: 'npm',
    purl: 'pkg:npm/react@18.2.0',
    // ... all required fields
  }
]
```

## Related Documentation

- [Test README](../../README.md) - Overall testing strategy
- [Service Tests](../services/README.md) - Testing service layer
- [Repository Tests](../repositories/README.md) - Testing data layer
- [vitest-cucumber](https://vitest-cucumber.miceli.click/) - BDD testing framework

## Example Test

See [`components.spec.ts`](./components.spec.ts) for a complete working example.
