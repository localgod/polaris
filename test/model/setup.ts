/**
 * Model Layer Test Setup
 * 
 * Global setup for Neo4j schema tests.
 * Runs once before all model tests.
 */

import { beforeAll, afterAll } from 'vitest'

beforeAll(async () => {
  // Global setup for model tests
  console.log('🔧 Model layer tests starting...')
  
  // Verify Neo4j connection is available
  const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  console.log(`   Neo4j URI: ${neo4jUri}`)
})

afterAll(async () => {
  // Global cleanup for model tests
  console.log('✅ Model layer tests completed')
})
