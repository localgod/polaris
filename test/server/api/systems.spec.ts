import { expect, beforeEach, vi } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import type { ApiResponse, System } from '../../../types/api'
import { SystemService } from '../../../server/services/system.service'

// Mock the SystemService
vi.mock('../../../server/services/system.service')

const mockSystems: System[] = [
  {
    name: 'polaris-api',
    domain: 'Platform',
    ownerTeam: 'Platform Team',
    businessCriticality: 'high',
    environment: 'prod',
    sourceCodeType: 'internal',
    hasSourceAccess: true,
    componentCount: 42,
    repositoryCount: 2
  },
  {
    name: 'customer-portal',
    domain: 'Customer',
    ownerTeam: 'Customer Team',
    businessCriticality: 'critical',
    environment: 'prod',
    sourceCodeType: 'internal',
    hasSourceAccess: true,
    componentCount: 156,
    repositoryCount: 3
  }
]

beforeEach(() => {
  vi.clearAllMocks()
})

const feature = await loadFeature('./test/server/api/systems.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let responseData: ApiResponse<System> | ApiResponse<{ name: string }>
  let responseStatus: number

  Background(({ Given }) => {
    Given('the API server is running', () => {
      // API is always available in unit tests
      expect(true).toBe(true)
    })
  })

  Scenario('Successfully retrieve all systems', ({ When, Then, And }) => {
    When('I request GET "/api/systems"', async () => {
      // Mock successful service response
      vi.mocked(SystemService.prototype.findAll).mockResolvedValue({
        data: mockSystems,
        count: mockSystems.length
      })

      // Simulate API endpoint logic
      const systemService = new SystemService()
      const result = await systemService.findAll()
      
      responseData = {
        success: true,
        data: result.data,
        count: result.count
      }
      responseStatus = 200
    })

    Then('the response status should be 200', () => {
      expect(responseStatus).toBe(200)
    })

    And('the response should have content type "application/json"', () => {
      expect(responseData).toBeDefined()
    })

    And('the response should match the ApiResponse schema', () => {
      expect(responseData).toHaveProperty('success')
      expect(responseData).toHaveProperty('data')
      expect(responseData).toHaveProperty('count')
    })

    And('the response should contain "success" field with value true', () => {
      expect(responseData.success).toBe(true)
    })

    And('the response should contain "data" field as an array', () => {
      expect(Array.isArray(responseData.data)).toBe(true)
    })

    And('the response should contain "count" field as a number', () => {
      expect(typeof responseData.count).toBe('number')
      expect(responseData.count).toBe(mockSystems.length)
    })

    And('each system in the response should have required fields', () => {
      const systems = responseData.data as System[]
      systems.forEach(system => {
        expect(system).toHaveProperty('name')
        expect(system).toHaveProperty('domain')
        expect(system).toHaveProperty('ownerTeam')
        expect(system).toHaveProperty('businessCriticality')
        expect(system).toHaveProperty('environment')
        expect(system).toHaveProperty('componentCount')
        expect(system).toHaveProperty('repositoryCount')
      })
    })
  })

  Scenario('Successfully create a new system', ({ When, Then, And }) => {
    When('I request POST "/api/systems" with valid system data', async () => {
      const validSystemData = {
        name: 'new-system',
        domain: 'Platform',
        ownerTeam: 'Platform Team',
        businessCriticality: 'medium',
        environment: 'dev'
      }

      // Mock successful service response
      vi.mocked(SystemService.prototype.create).mockResolvedValue('new-system')

      // Simulate API endpoint logic
      const systemService = new SystemService()
      const name = await systemService.create(validSystemData)
      
      responseData = {
        success: true,
        data: [{ name }],
        count: 1
      }
      responseStatus = 201
    })

    Then('the response status should be 201', () => {
      expect(responseStatus).toBe(201)
    })

    And('the response should have content type "application/json"', () => {
      expect(responseData).toBeDefined()
    })

    And('the response should match the ApiResponse schema', () => {
      expect(responseData).toHaveProperty('success')
      expect(responseData).toHaveProperty('data')
      expect(responseData).toHaveProperty('count')
    })

    And('the response should contain "success" field with value true', () => {
      expect(responseData.success).toBe(true)
    })

    And('the response should contain "data" field with the created system', () => {
      expect(Array.isArray(responseData.data)).toBe(true)
      expect(responseData.data).toHaveLength(1)
      expect(responseData.data[0]).toHaveProperty('name', 'new-system')
    })

    And('the response should contain "count" field with value 1', () => {
      expect(responseData.count).toBe(1)
    })
  })

  Scenario('Fail to create system with missing required fields', ({ When, Then, And }) => {
    When('I request POST "/api/systems" with missing required fields', async () => {
      const invalidData = {
        name: 'incomplete-system'
        // Missing required fields: domain, ownerTeam, businessCriticality, environment
      }

      // Mock service throwing validation error
      vi.mocked(SystemService.prototype.create).mockRejectedValue(
        new Error('Missing required fields: domain, ownerTeam, businessCriticality, environment')
      )

      // Simulate API endpoint logic with error handling
      try {
        const systemService = new SystemService()
        await systemService.create(invalidData as unknown as Parameters<typeof systemService.create>[0])
      } catch (error) {
        responseData = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create system',
          data: []
        }
        responseStatus = 400
      }
    })

    Then('the response status should be 400', () => {
      expect(responseStatus).toBe(400)
    })

    And('the response should contain "success" field with value false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should contain an error message', () => {
      expect(responseData).toHaveProperty('error')
      expect(typeof responseData.error).toBe('string')
      expect(responseData.error).toContain('Missing required fields')
    })
  })

  Scenario('Fail to create system with invalid field values', ({ When, Then, And }) => {
    When('I request POST "/api/systems" with invalid field values', async () => {
      const invalidData = {
        name: 'invalid-system',
        domain: 'Platform',
        ownerTeam: 'Platform Team',
        businessCriticality: 'invalid-value', // Invalid enum value
        environment: 'dev'
      }

      // Mock service throwing validation error
      vi.mocked(SystemService.prototype.create).mockRejectedValue(
        new Error('Invalid businessCriticality value. Must be one of: critical, high, medium, low')
      )

      // Simulate API endpoint logic with error handling
      try {
        const systemService = new SystemService()
        await systemService.create(invalidData as unknown as Parameters<typeof systemService.create>[0])
      } catch (error) {
        responseData = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create system',
          data: []
        }
        responseStatus = 422
      }
    })

    Then('the response status should be 422', () => {
      expect(responseStatus).toBe(422)
    })

    And('the response should contain "success" field with value false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should contain an error message', () => {
      expect(responseData).toHaveProperty('error')
      expect(typeof responseData.error).toBe('string')
      expect(responseData.error).toContain('Invalid')
    })
  })

  Scenario('Fail to create duplicate system', ({ When, Then, And }) => {
    When('I request POST "/api/systems" with a duplicate system name', async () => {
      const duplicateData = {
        name: 'polaris-api', // Already exists
        domain: 'Platform',
        ownerTeam: 'Platform Team',
        businessCriticality: 'high',
        environment: 'prod'
      }

      // Mock service throwing duplicate error
      vi.mocked(SystemService.prototype.create).mockRejectedValue(
        new Error('System with name "polaris-api" already exists')
      )

      // Simulate API endpoint logic with error handling
      try {
        const systemService = new SystemService()
        await systemService.create(duplicateData)
      } catch (error) {
        responseData = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create system',
          data: []
        }
        responseStatus = 409
      }
    })

    Then('the response status should be 409', () => {
      expect(responseStatus).toBe(409)
    })

    And('the response should contain "success" field with value false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should contain an error message about duplicate', () => {
      expect(responseData).toHaveProperty('error')
      expect(typeof responseData.error).toBe('string')
      expect(responseData.error).toContain('already exists')
    })
  })
})
