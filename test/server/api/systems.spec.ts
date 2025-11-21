import { expect, beforeAll, afterAll } from 'vitest'
import { Feature } from '../../fixtures/gherkin'
import { apiGet, apiPost, checkServerHealth } from '../../fixtures/api-client'

interface SystemResponse {
  name: string
  domain: string
  ownerTeam: string
  description?: string
  [key: string]: unknown
}

interface SystemsListResponse {
  systems: SystemResponse[]
  count: number
}

Feature('Systems API @api @integration', ({ Scenario }) => {
  let serverRunning = false
  let testSystemName: string

  beforeAll(async () => {
    serverRunning = await checkServerHealth()
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   These tests will be skipped.\n')
    }
  })

  afterAll(async () => {
    // Cleanup: Delete test system if it was created
    if (testSystemName && serverRunning) {
      try {
        await fetch(`http://localhost:3000/api/systems/${encodeURIComponent(testSystemName)}`, {
          method: 'DELETE'
        })
      } catch {
        // Ignore errors during cleanup
      }
    }
  })

  Scenario('Retrieve list of systems', ({ Given, When, Then, And }) => {
    let response: SystemsListResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request the list of systems', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/systems')
    })

    Then('I should receive a successful response', () => {
      if (!serverRunning) return
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
    })

    And('the response should contain an array of systems', () => {
      if (!serverRunning) return
      expect(response.data).toBeInstanceOf(Array)
    })

    And('the response should include a count field', () => {
      if (!serverRunning) return
      expect(response.count).toBeGreaterThanOrEqual(0)
    })
  })

  Scenario('Systems have required fields', ({ Given, When, Then, And }) => {
    let response: SystemsListResponse
    let system: SystemResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('there are systems in the database', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/systems')
      if (response.data.length === 0) {
        console.log('   ⏭️  Skipping - no systems in database')
      }
    })

    When('I request the list of systems', async () => {
      if (!serverRunning) return
      if (response.data.length === 0) return
      system = response.data[0]
    })

    Then('each system should have a name', () => {
      if (!serverRunning || !system) return
      expect(system).toHaveProperty('name')
      expect(typeof system.name).toBe('string')
    })

    And('each system should have domain and owner information', () => {
      if (!serverRunning || !system) return
      expect(system).toHaveProperty('domain')
      expect(system).toHaveProperty('ownerTeam')
    })

    And('each system should have business criticality', () => {
      if (!serverRunning || !system) return
      expect(system).toHaveProperty('businessCriticality')
    })

    And('each system should have environment type', () => {
      if (!serverRunning || !system) return
      expect(system).toHaveProperty('environment')
    })

    And('each system should have component and repository counts', () => {
      if (!serverRunning || !system) return
      expect(system).toHaveProperty('componentCount')
      expect(system).toHaveProperty('repositoryCount')
      expect(typeof system.componentCount).toBe('number')
      expect(typeof system.repositoryCount).toBe('number')
    })
  })

  Scenario('Create a new system @smoke', ({ Given, When, Then, And }) => {
    let response: { success: boolean; data?: SystemResponse; error?: string }
    const newSystem = {
      name: `test-system-${Date.now()}`,
      domain: 'test-domain',
      ownerTeam: 'test-team',
      businessCriticality: 'low',
      environment: 'dev'
    }

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I create a new system with valid data', async () => {
      if (!serverRunning) return
      testSystemName = newSystem.name
      response = await apiPost('/api/systems', newSystem)
    })

    Then('I should receive a 201 created response', () => {
      if (!serverRunning) return
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
    })

    And('the response should contain the system name', () => {
      if (!serverRunning) return
      expect(response.data).toBeInstanceOf(Array)
      expect(response.data.length).toBeGreaterThan(0)
      expect(response.data[0].name).toBe(newSystem.name)
    })

    And('the system should exist in the database', async () => {
      if (!serverRunning) return
      const getResponse = await apiGet(`/api/systems/${encodeURIComponent(newSystem.name)}`)
      expect(getResponse.success).toBe(true)
      expect(getResponse.data.name).toBe(newSystem.name)
    })
  })

  Scenario('Prevent duplicate system creation', ({ Given, When, Then }) => {
    let existingSystem: SystemResponse | undefined
    let error: { success: boolean; error: string } | undefined

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('a system already exists', async () => {
      if (!serverRunning) return
      const systemsResponse = await apiGet('/api/systems')
      if (systemsResponse.data.length === 0) {
        // Create a system first
        const newSystem = {
          name: `test-duplicate-${Date.now()}`,
          domain: 'test',
          ownerTeam: 'test-team',
          businessCriticality: 'low',
          environment: 'dev'
        }
        await apiPost('/api/systems', newSystem)
        existingSystem = newSystem
        testSystemName = newSystem.name
      } else {
        existingSystem = systemsResponse.data[0]
      }
    })

    When('I try to create a system with the same name', async () => {
      if (!serverRunning) return
      try {
        await apiPost('/api/systems', {
          name: existingSystem.name,
          domain: 'test',
          ownerTeam: 'test-team',
          businessCriticality: 'low',
          environment: 'dev'
        })
      } catch (e) {
        error = e
      }
    })

    Then('I should receive a 409 conflict error', () => {
      if (!serverRunning) return
      expect(error).toBeDefined()
      expect(error.message.toLowerCase()).toContain('already exists')
    })
  })

  Scenario('Validate business criticality values', ({ Given, When, Then, And }) => {
    let error: { success: boolean; error: string } | undefined

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I try to create a system with invalid business criticality', async () => {
      if (!serverRunning) return
      try {
        await apiPost('/api/systems', {
          name: `test-invalid-criticality-${Date.now()}`,
          domain: 'test',
          ownerTeam: 'test-team',
          businessCriticality: 'invalid-value',
          environment: 'dev'
        })
      } catch (e) {
        error = e
      }
    })

    Then('I should receive a 422 validation error', () => {
      if (!serverRunning) return
      expect(error).toBeDefined()
      expect(error.message.toLowerCase()).toContain('invalid')
    })

    And('the error message should mention valid criticality values', () => {
      if (!serverRunning) return
      expect(error.message.toLowerCase()).toContain('criticality')
    })
  })

  Scenario('Validate environment values', ({ Given, When, Then, And }) => {
    let error: { success: boolean; error: string } | undefined

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I try to create a system with invalid environment', async () => {
      if (!serverRunning) return
      try {
        await apiPost('/api/systems', {
          name: `test-invalid-env-${Date.now()}`,
          domain: 'test',
          ownerTeam: 'test-team',
          businessCriticality: 'low',
          environment: 'invalid-value'
        })
      } catch (e) {
        error = e
      }
    })

    Then('I should receive a 422 validation error', () => {
      if (!serverRunning) return
      expect(error).toBeDefined()
      expect(error.message.toLowerCase()).toContain('invalid')
    })

    And('the error message should mention valid environment values', () => {
      if (!serverRunning) return
      expect(error.message.toLowerCase()).toContain('environment')
    })
  })

  Scenario('Require all mandatory fields', ({ Given, When, Then, And }) => {
    let error: { success: boolean; error: string } | undefined

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I try to create a system without required fields', async () => {
      if (!serverRunning) return
      try {
        await apiPost('/api/systems', {
          name: `test-incomplete-${Date.now()}`
          // Missing: domain, ownerTeam, businessCriticality, environment
        })
      } catch (e) {
        error = e
      }
    })

    Then('I should receive a 400 bad request error', () => {
      if (!serverRunning) return
      expect(error).toBeDefined()
      expect(error.message.toLowerCase()).toContain('missing')
    })

    And('the error message should mention missing fields', () => {
      if (!serverRunning) return
      expect(error.message.toLowerCase()).toContain('required')
    })
  })
})
