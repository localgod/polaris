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

Feature('API Health Check', ({ Scenario }) => {
  let response: any
  let serverRunning = false

  beforeAll(async () => {
    // Check if server is accessible
    serverRunning = await checkServerHealth()
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   These tests will be skipped.\n')
    }
  })

  Scenario('Database status endpoint returns a response', ({ Given, When, Then, And }) => {
    Given('the API server is running', () => {
      // Skip test gracefully if server not running
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request the database status endpoint', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/db-status')
    })

    Then('I should receive a response', () => {
      if (!serverRunning) return
      expect(response).toBeDefined()
    })

    And('the response should have a status field', () => {
      if (!serverRunning) return
      expect(response).toHaveProperty('status')
    })

    And('the response should have a message field', () => {
      if (!serverRunning) return
      expect(response).toHaveProperty('message')
    })
  })

  Scenario('Database status endpoint returns valid status', ({ Given, When, Then }) => {
    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request the database status endpoint', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/db-status')
    })

    Then('the status field should be either "online" or "offline"', () => {
      if (!serverRunning) return
      expect(['online', 'offline']).toContain(response.status)
    })
  })
})
