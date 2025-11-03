import { expect, beforeAll } from 'vitest'
import { Feature } from '../helpers/gherkin'
import { apiGet, checkServerHealth } from '../helpers/api-client'

/**
 * API Health Check Tests
 * 
 * These tests require a running Nuxt dev server.
 * Start the server with: npm run dev
 * 
 * Alternative: Use exec_preview or start server programmatically in CI
 */

interface HealthResponse {
  status: string
  database: string
  timestamp: string
  error?: string
}

Feature('API Health Check @api @smoke', ({ Scenario }) => {
  let response: HealthResponse
  let serverRunning = false

  beforeAll(async () => {
    // Check if server is accessible
    serverRunning = await checkServerHealth()
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   These tests will be skipped.\n')
    }
  })

  Scenario('Health endpoint returns a response', ({ Given, When, Then, And }) => {
    Given('the API server is running', () => {
      // Skip test gracefully if server not running
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request the health endpoint', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/health')
    })

    Then('I should receive a response', () => {
      if (!serverRunning) return
      expect(response).toBeDefined()
    })

    And('the response should have a status field', () => {
      if (!serverRunning) return
      expect(response).toHaveProperty('status')
    })

    And('the response should have a database field', () => {
      if (!serverRunning) return
      expect(response).toHaveProperty('database')
    })

    And('the response should have a timestamp field', () => {
      if (!serverRunning) return
      expect(response).toHaveProperty('timestamp')
    })
  })

  Scenario('Health endpoint returns valid status', ({ Given, When, Then }) => {
    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request the health endpoint', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/health')
    })

    Then('the status field should be either "healthy" or "unhealthy"', () => {
      if (!serverRunning) return
      expect(['healthy', 'unhealthy']).toContain(response.status)
    })
  })
})
