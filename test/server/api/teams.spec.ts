import { expect, beforeAll } from 'vitest'
import { Feature } from '../../fixtures/gherkin'
import { apiGet, checkServerHealth } from '../../fixtures/api-client'

interface TeamResponse {
  name: string
  email: string
  responsibilityArea: string
  [key: string]: unknown
}

interface TeamsListResponse {
  teams: TeamResponse[]
  count: number
}

Feature('Teams API @api @integration', ({ Scenario }) => {
  let serverRunning = false

  beforeAll(async () => {
    serverRunning = await checkServerHealth()
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   These tests will be skipped.\n')
    }
  })

  Scenario('Retrieve list of teams', ({ Given, When, Then, And }) => {
    let response: TeamsListResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request the list of teams', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/teams')
    })

    Then('I should receive a successful response', () => {
      if (!serverRunning) return
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
    })

    And('the response should contain an array of teams', () => {
      if (!serverRunning) return
      expect(response.data).toBeInstanceOf(Array)
    })

    And('the response should have a count property', () => {
      if (!serverRunning) return
      expect(response.count).toBeDefined()
      expect(typeof response.count).toBe('number')
    })
  })

  Scenario('Teams have required fields', ({ Given, When, Then }) => {
    let response: TeamsListResponse

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request the list of teams', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/teams')
    })

    Then('each team should have required fields', () => {
      if (!serverRunning) return
      if (response.data.length === 0) return // Skip if no teams

      const team = response.data[0]
      expect(team).toHaveProperty('name')
      expect(team).toHaveProperty('email')
    })
  })

  Scenario('Get team technology usage @smoke', ({ Given, When, Then, And }) => {
    let response: { technologies: unknown[]; count: number }
    let teamName: string

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    And('I know a team name', async () => {
      if (!serverRunning) return
      const teamsResponse = await apiGet('/api/teams')
      if (teamsResponse.data.length === 0) {
        console.log('   ⏭️  Skipping - no teams available')
        return
      }
      teamName = teamsResponse.data[0].name
    })

    When('I request the team usage', async () => {
      if (!serverRunning || !teamName) return
      response = await apiGet(`/api/teams/${encodeURIComponent(teamName)}/usage`)
    })

    Then('I should receive usage data', () => {
      if (!serverRunning || !teamName) return
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
    })

    And('the response should include team name', () => {
      if (!serverRunning || !teamName) return
      expect(response.data.team).toBe(teamName)
    })

    And('the response should include usage array', () => {
      if (!serverRunning || !teamName) return
      expect(response.data.usage).toBeInstanceOf(Array)
    })

    And('the response should include summary statistics', () => {
      if (!serverRunning || !teamName) return
      expect(response.data.summary).toBeDefined()
      expect(response.data.summary).toHaveProperty('totalTechnologies')
      expect(response.data.summary).toHaveProperty('compliant')
      expect(response.data.summary).toHaveProperty('unapproved')
      expect(response.data.summary).toHaveProperty('violations')
      expect(response.data.summary).toHaveProperty('migrationNeeded')
    })
  })
})
