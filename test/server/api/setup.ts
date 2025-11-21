/**
 * API Layer Test Setup
 * 
 * Global setup for HTTP endpoint tests.
 * Runs once before all API tests.
 */

import { beforeAll, afterAll } from 'vitest'
import { checkServerHealth } from '../../fixtures/api-client'

// Note: This is intentionally not exported as tests should check server health individually
// to avoid race conditions and ensure proper test isolation

beforeAll(async () => {
  // Global setup for API tests
  console.log('🔧 API layer tests starting...')
  
  // Check if dev server is running
  const serverRunning = await checkServerHealth()
  
  if (!serverRunning) {
    console.warn('⚠️  Nuxt dev server not running. Start with: npm run dev')
    console.warn('   API tests will be skipped.')
  } else {
    console.log('✅ Nuxt dev server is running')
  }
})

afterAll(async () => {
  // Global cleanup for API tests
  console.log('✅ API layer tests completed')
})
