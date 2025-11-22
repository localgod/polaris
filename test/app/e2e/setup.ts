/**
 * UI Layer Test Setup
 * 
 * Global setup for E2E tests using Playwright.
 * Runs once before all UI tests.
 */

import { beforeAll, afterAll } from 'vitest'

// Note: Browser instances are created per-test to ensure proper isolation
// Global browser setup is not used to avoid race conditions

beforeAll(async () => {
  // Global setup for UI tests
  console.log('🔧 UI layer tests starting...')
})

afterAll(async () => {
  // Global cleanup for UI tests
  console.log('✅ UI layer tests completed')
})
