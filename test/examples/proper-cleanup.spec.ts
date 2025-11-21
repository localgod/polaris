/**
 * Example: Proper Test Cleanup Pattern
 * 
 * This file demonstrates the correct way to write tests that interact
 * with the database and ensure proper cleanup.
 */

import { expect, beforeAll, afterAll } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import type { Driver } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { cleanupTestData, createCleanup, verifyCleanDatabase } from '../../fixtures/db-cleanup'

const feature = await loadFeature('./test/examples/proper-cleanup.feature')

describeFeature(feature, ({ Scenario }) => {
  let driver: Driver
  let serverRunning = false
  const TEST_PREFIX = 'test_example_'

  beforeAll(async () => {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
    const username = process.env.NEO4J_USERNAME || 'neo4j'
    const password = process.env.NEO4J_PASSWORD || 'devpassword'

    try {
      driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
      await driver.verifyConnectivity()
      serverRunning = true
    } catch {
      console.warn('\n⚠️  Neo4j not available. Tests will be skipped.\n')
      serverRunning = false
    }
  })

  afterAll(async () => {
    if (serverRunning && driver) {
      // Clean up all test data
      await cleanupTestData(driver, { prefix: TEST_PREFIX })
      
      // Verify cleanup was successful
      const isClean = await verifyCleanDatabase(driver, TEST_PREFIX)
      if (!isClean) {
        console.warn('⚠️  Warning: Test data was not fully cleaned up')
      }
      
      await driver.close()
    }
  })

  // Removed beforeEach - it was cleaning up between test steps which broke the tests!
  // Each Gherkin step (Given/When/Then/And) is treated as a separate test by vitest-cucumber
  // so beforeEach would run between steps, deleting data created in previous steps.

  Scenario('Create and verify test data with cleanup', ({ Given, When, Then, And }) => {
    let _nodeId: string

    Given('the database is clean', async () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - database not available')
        return
      }
      
      const isClean = await verifyCleanDatabase(driver, TEST_PREFIX)
      expect(isClean).toBe(true)
    })

    When('I create a test node', async () => {
      if (!serverRunning) return
      
      const session = driver.session()
      try {
        const result = await session.run(`
          CREATE (n:TestNode {
            name: $name,
            createdAt: datetime()
          })
          RETURN elementId(n) as id
        `, { name: `${TEST_PREFIX}node1` })
        
        _nodeId = result.records[0].get('id')
      } finally {
        await session.close()
      }
    })

    Then('the node should exist in the database', async () => {
      if (!serverRunning) return
      
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (n:TestNode {name: $name})
          RETURN n
        `, { name: `${TEST_PREFIX}node1` })
        
        expect(result.records).toHaveLength(1)
      } finally {
        await session.close()
      }
    })

    And('cleanup should remove the test data', async () => {
      if (!serverRunning) return
      
      // Explicit cleanup in test
      await cleanupTestData(driver, { prefix: TEST_PREFIX })
      
      // Verify it's gone
      const isClean = await verifyCleanDatabase(driver, TEST_PREFIX)
      expect(isClean).toBe(true)
    })
  })

  Scenario('Using helper function for cleanup', ({ Given, When, Then }) => {
    Given('I have test data', async () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - database not available')
        return
      }
      
      const session = driver.session()
      try {
        await session.run(`
          CREATE (n:TestNode {name: $name})
        `, { name: `${TEST_PREFIX}node2` })
      } finally {
        await session.close()
      }
    })

    When('I run cleanup', async () => {
      if (!serverRunning) return
      // Option 2: Use cleanup helper
      const cleanup = createCleanup(driver, { prefix: TEST_PREFIX })
      await cleanup()
    })

    Then('the database should be clean', async () => {
      if (!serverRunning) return
      
      const isClean = await verifyCleanDatabase(driver, TEST_PREFIX)
      expect(isClean).toBe(true)
    })
  })
})
