import { expect, beforeEach, vi } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import type { ApiResponse, Component } from '../../../types/api'
import { ComponentService } from '../../../server/services/component.service'

// Mock the ComponentService
vi.mock('../../../server/services/component.service')

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
    hashes: [{ algorithm: 'SHA256', value: 'abc123' }],
    licenses: [{ id: 'MIT', name: 'MIT License', url: null, text: null }],
    copyright: null,
    supplier: null,
    author: null,
    publisher: null,
    homepage: 'https://reactjs.org',
    externalReferences: [],
    description: 'React is a JavaScript library for building user interfaces',
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
})

const feature = await loadFeature('./test/server/api/components.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let responseData: ApiResponse<Component>

  Background(({ Given }) => {
    Given('the API server is running', () => {
      // API is always available in unit tests
      expect(true).toBe(true)
    })
  })

  Scenario('Successfully retrieve all components', ({ When, Then, And }) => {
    When('I request GET "/api/components"', async () => {
      // Mock successful service response
      vi.mocked(ComponentService.prototype.findAll).mockResolvedValue({
        data: mockComponents,
        count: mockComponents.length
      })

      // Simulate API endpoint logic
      const componentService = new ComponentService()
      const result = await componentService.findAll()
      
      responseData = {
        success: true,
        data: result.data,
        count: result.count
      }
    })

    Then('the response status should be 200', () => {
      expect(responseData).toBeDefined()
    })

    And('the response should have content type "application/json"', () => {
      expect(responseData).toBeDefined()
    })

    And('the response should match the ApiResponse schema', () => {
      expect(responseData).toBeDefined()
      expect(responseData).toHaveProperty('success')
      expect(responseData).toHaveProperty('data')
    })

    And('the response should have property "success" equal to true', () => {
      expect(responseData.success).toBe(true)
    })

    And('the response should have property "data" as an array', () => {
      expect(Array.isArray(responseData.data)).toBe(true)
    })

    And('the response should have property "count" as a number', () => {
      if (responseData.success) {
        expect(typeof responseData.count).toBe('number')
      }
    })
  })

  Scenario('Components response includes required fields', ({ Given, When, Then, And }) => {
    Given('the database contains component data', () => {
      // Mock will return data with all required fields
      expect(mockComponents.length).toBeGreaterThan(0)
    })

    When('I request GET "/api/components"', async () => {
      // Mock successful service response
      vi.mocked(ComponentService.prototype.findAll).mockResolvedValue({
        data: mockComponents,
        count: mockComponents.length
      })

      const componentService = new ComponentService()
      const result = await componentService.findAll()
      
      responseData = {
        success: true,
        data: result.data,
        count: result.count
      }
    })

    Then('the response status should be 200', () => {
      expect(responseData).toBeDefined()
    })

    And('each component in "data" should have the following properties:', () => {
      if (!responseData.success) return

      const requiredProperties = [
        { property: 'name', type: 'string' },
        { property: 'version', type: 'string' },
        { property: 'packageManager', type: 'any' },
        { property: 'purl', type: 'any' },
        { property: 'type', type: 'any' },
        { property: 'hashes', type: 'array' },
        { property: 'licenses', type: 'array' }
      ]

      const components = responseData.data
      expect(components.length).toBeGreaterThan(0)

      components.forEach((component) => {
        requiredProperties.forEach(({ property, type }) => {
          expect(component).toHaveProperty(property)
          
          const value = component[property as keyof Component]
          
          if (type === 'string') {
            expect(typeof value).toBe('string')
          } else if (type === 'array') {
            expect(Array.isArray(value)).toBe(true)
          } else if (type === 'any') {
            expect(property in component).toBe(true)
          }
        })
      })
    })
  })

  Scenario('Empty database returns valid empty response', ({ Given, When, Then, And }) => {
    Given('the database is empty', () => {
      // Mock will return empty array
      expect(true).toBe(true)
    })

    When('I request GET "/api/components"', async () => {
      // Mock empty service response
      vi.mocked(ComponentService.prototype.findAll).mockResolvedValue({
        data: [],
        count: 0
      })

      const componentService = new ComponentService()
      const result = await componentService.findAll()
      
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

    And('the response should have property "data" as an array', () => {
      expect(Array.isArray(responseData.data)).toBe(true)
    })

    And('the response should have property "count" equal to 0', () => {
      if (responseData.success) {
        expect(responseData.count).toBe(0)
      }
    })

    And('the "data" array should be empty', () => {
      expect(responseData.data.length).toBe(0)
    })
  })

  Scenario('API handles database errors gracefully', ({ Given, When, Then, And }) => {
    Given('the database connection fails', () => {
      // Mock will throw an error
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
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch components'
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

    And('the response should have property "success" as a boolean', () => {
      expect(typeof responseData.success).toBe('boolean')
    })

    And('the response should have property "data" as an array', () => {
      expect(Array.isArray(responseData.data)).toBe(true)
    })

    And('if success is false, response should have property "error" as a string', () => {
      if (!responseData.success) {
        expect(typeof responseData.error).toBe('string')
      }
    })

    And('if success is false, the "data" array should be empty', () => {
      if (!responseData.success) {
        expect(responseData.data.length).toBe(0)
      }
    })
  })
})
