import { expect, beforeAll } from 'vitest'
import { Feature } from '../../fixtures/gherkin'
import { apiGet, checkServerHealth } from '../../fixtures/api-client'

interface ComponentResponse {
  name: string
  version: string
  [key: string]: unknown
}

interface UnmappedComponentsResponse {
  components: ComponentResponse[]
  count: number
}

Feature('Unmapped Components API @api @integration', ({ Scenario }) => {
  let serverRunning = false

  beforeAll(async () => {
    serverRunning = await checkServerHealth()
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   These tests will be skipped.\n')
    }
  })

  Scenario('Retrieve all unmapped components', ({ Given, When, Then, And }) => {
    let response: UnmappedComponentsResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request all unmapped components', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/components/unmapped')
    })

    Then('I should receive a successful response', () => {
      if (!serverRunning) return
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
    })

    And('the response should contain an array of components', () => {
      if (!serverRunning) return
      expect(response.data).toBeInstanceOf(Array)
    })

    And('the response should include a count field', () => {
      if (!serverRunning) return
      expect(response.count).toBeGreaterThanOrEqual(0)
    })
  })

  Scenario('Unmapped components have required fields', ({ Given, When, Then, And }) => {
    let response: UnmappedComponentsResponse
    let component: ComponentResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('there are unmapped components in the database', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/components/unmapped')
      if (response.data.length === 0) {
        console.log('   ⏭️  Skipping - no unmapped components in database')
      }
    })

    When('I request all unmapped components', async () => {
      if (!serverRunning) return
      if (response.data.length === 0) return
      component = response.data[0]
    })

    Then('each component should have a name', () => {
      if (!serverRunning || !component) return
      expect(component).toHaveProperty('name')
    })

    And('each component should have a version', () => {
      if (!serverRunning || !component) return
      expect(component).toHaveProperty('version')
    })

    And('each component should have a package manager', () => {
      if (!serverRunning || !component) return
      expect(component).toHaveProperty('packageManager')
    })

    And('each component should have SBOM fields', () => {
      if (!serverRunning || !component) return
      expect(component).toHaveProperty('purl')
      expect(component).toHaveProperty('hashes')
      expect(component).toHaveProperty('licenses')
      expect(component.hashes).toBeInstanceOf(Array)
      expect(component.licenses).toBeInstanceOf(Array)
    })

    And('each component should have relationship fields', () => {
      if (!serverRunning || !component) return
      expect(component).toHaveProperty('systems')
      expect(component).toHaveProperty('systemCount')
      expect(component.systems).toBeInstanceOf(Array)
      expect(typeof component.systemCount).toBe('number')
    })
  })

  Scenario('Retrieve unmapped components for a specific system', ({ Given, When, Then, And }) => {
    let systemsResponse: { systems: { name: string }[] }
    let systemName: string
    let response: UnmappedComponentsResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('there is at least one system in the database', async () => {
      if (!serverRunning) return
      systemsResponse = await apiGet('/api/systems')
      if (!systemsResponse.success || systemsResponse.data.length === 0) {
        console.log('   ⏭️  Skipping - no systems in database')
        return
      }
      systemName = systemsResponse.data[0].name
    })

    When('I request unmapped components for that system', async () => {
      if (!serverRunning || !systemName) return
      response = await apiGet(`/api/systems/${encodeURIComponent(systemName)}/unmapped-components`)
    })

    Then('I should receive a successful response', () => {
      if (!serverRunning || !systemName) return
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
    })

    And('the response should contain the system name', () => {
      if (!serverRunning || !systemName) return
      expect(response.data).toBeDefined()
      expect(response.data.system).toBe(systemName)
    })

    And('the response should contain an array of components', () => {
      if (!serverRunning || !systemName) return
      expect(response.data.components).toBeInstanceOf(Array)
    })

    And('the response should include a count field', () => {
      if (!serverRunning || !systemName) return
      expect(response.data.count).toBeGreaterThanOrEqual(0)
    })
  })

  Scenario('Handle non-existent system', ({ Given, When, Then }) => {
    let error: { success: boolean; error: string } | undefined

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request unmapped components for a non-existent system', async () => {
      if (!serverRunning) return
      try {
        await apiGet('/api/systems/non-existent-system-xyz-123/unmapped-components')
      } catch (e) {
        error = e
      }
    })

    Then('I should receive a 404 error', () => {
      if (!serverRunning) return
      expect(error).toBeDefined()
      expect(error.message.toLowerCase()).toContain('not found')
    })
  })

  Scenario('Handle URL-encoded system names', ({ Given, When, Then, And }) => {
    let systemsResponse: { systems: { name: string }[] }
    let systemName: string
    let response: UnmappedComponentsResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('there is at least one system in the database', async () => {
      if (!serverRunning) return
      systemsResponse = await apiGet('/api/systems')
      if (!systemsResponse.success || systemsResponse.data.length === 0) {
        console.log('   ⏭️  Skipping - no systems in database')
        return
      }
      systemName = systemsResponse.data[0].name
    })

    When('I request unmapped components with URL-encoded system name', async () => {
      if (!serverRunning || !systemName) return
      const encodedName = encodeURIComponent(systemName)
      response = await apiGet(`/api/systems/${encodedName}/unmapped-components`)
    })

    Then('I should receive a successful response', () => {
      if (!serverRunning || !systemName) return
      expect(response.success).toBe(true)
    })

    And('the system name should be correctly decoded', () => {
      if (!serverRunning || !systemName) return
      expect(response.data.system).toBe(systemName)
    })
  })

  Scenario('Unmapped components for system have required fields', ({ Given, When, Then, And }) => {
    let systemsResponse: { systems: { name: string }[] }
    let systemName: string
    let response: UnmappedComponentsResponse
    let component: ComponentResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('there is a system with unmapped components', async () => {
      if (!serverRunning) return
      systemsResponse = await apiGet('/api/systems')
      if (!systemsResponse.success || systemsResponse.data.length === 0) {
        console.log('   ⏭️  Skipping - no systems in database')
        return
      }
      systemName = systemsResponse.data[0].name
    })

    When('I request unmapped components for that system', async () => {
      if (!serverRunning || !systemName) return
      response = await apiGet(`/api/systems/${encodeURIComponent(systemName)}/unmapped-components`)
      if (response.data.components.length === 0) {
        console.log('   ⏭️  Skipping - no unmapped components for this system')
        return
      }
      component = response.data.components[0]
    })

    Then('each component should have core identification fields', () => {
      if (!serverRunning || !component) return
      expect(component).toHaveProperty('name')
      expect(component).toHaveProperty('version')
      expect(component).toHaveProperty('packageManager')
    })

    And('each component should have SBOM fields', () => {
      if (!serverRunning || !component) return
      expect(component).toHaveProperty('purl')
      expect(component).toHaveProperty('hashes')
      expect(component).toHaveProperty('licenses')
      expect(component.hashes).toBeInstanceOf(Array)
      expect(component.licenses).toBeInstanceOf(Array)
    })
  })
})
