# API Integration Tests

This directory contains API-layer tests (Gherkin/BDD-style examples). This file focuses on API-specific patterns and examples. For general testing principles, scripts and the three-layer strategy, see `../README.md`.

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

## Related Documentation

- [Test README](../README.md) - Canonical server testing overview
- [Service Tests](../services/README.md) - Testing service layer
- [Repository Tests](../repositories/README.md) - Testing data layer
- [vitest-cucumber](https://vitest-cucumber.miceli.click/) - BDD testing framework

## Example Test

See [`components.spec.ts`](./components.spec.ts) for a complete working example.
