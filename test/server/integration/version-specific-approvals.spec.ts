import { expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Driver, Record } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'

/**
 * Version-Specific Technology Approvals Tests
 * 
 * These tests verify that teams can approve or restrict specific versions
 * of technologies, enabling fine-grained version policies and migration
 * management.
 * 
 * Note: These are placeholder tests for the proposed schema enhancement.
 * Implementation requires migration to add version-level APPROVES relationships.
 */

const feature = await loadFeature('./test/server/integration/features/version-specific-approvals.feature')

describeFeature(feature, ({ Scenario }) => {
  let driver: Driver
  let serverRunning = false
  let approvalStatus: string | null = null
  let approvalResults: Record[] = []
  let systemsResult: Record[] = []

  beforeAll(async () => {
    const uri = process.env.NEO4J_TEST_URI || process.env.NEO4J_URI || 'neo4j://neo4j:7687'
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
    if (!serverRunning) return
    
    const session = driver.session()
    try {
      // Clean up test data
      await session.run('MATCH (n) WHERE n:Team OR n:Technology OR n:System DETACH DELETE n')
    } finally {
      await session.close()
    }
    
    if (driver) {
      await driver.close()
    }
  })

  beforeEach(async () => {
    if (!serverRunning) return

    const session = driver.session()
    try {
      // Clean up test data
      await session.run('MATCH (n) WHERE n:Team OR n:Technology OR n:System DETACH DELETE n')
    } finally {
      await session.close()
    }
    
    // Reset result variables
    approvalStatus = null
    approvalResults = []
    systemsResult = []
  })

  Scenario('Team approves specific versions only', ({ Given, And, When, Then }) => {
    Given('a Neo4j database is available', () => {
      if (!serverRunning) return
      expect(driver).toBeDefined()
    })

    And('the "Backend Team" approves "Java" version "17" with status "approved"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        // Create Team, Technology, and approval relationship
        await session.run(`
          MERGE (team:Team {name: $teamName})
          MERGE (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            version: $version,
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Java', version: '17', status: 'approved' })
      } finally {
        await session.close()
      }
    })

    And('the "Backend Team" approves "Java" version "11" with status "deprecated"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            version: $version,
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Java', version: '11', status: 'deprecated' })
      } finally {
        await session.close()
      }
    })

    When('I query "Backend Team" approval for "Java" version "17"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          WHERE r.version = $version
          RETURN r.status as status
        `, { teamName: 'Backend Team', techName: 'Java', version: '17' })
        
        if (result.records.length > 0) {
          approvalStatus = result.records[0].get('status')
        } else {
          approvalStatus = 'restricted' // default if no approval found
        }
      } finally {
        await session.close()
      }
    })

    Then('the status should be "approved"', () => {
      if (!serverRunning) return
      expect(approvalStatus).toBe('approved')
    })

    When('I query "Backend Team" approval for "Java" version "11"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          WHERE r.version = $version
          RETURN r.status as status
        `, { teamName: 'Backend Team', techName: 'Java', version: '11' })
        
        if (result.records.length > 0) {
          approvalStatus = result.records[0].get('status')
        } else {
          approvalStatus = 'restricted'
        }
      } finally {
        await session.close()
      }
    })

    Then('the status should be "deprecated"', () => {
      if (!serverRunning) return
      expect(approvalStatus).toBe('deprecated')
    })
  })

  Scenario('Different teams approve different versions of same technology', ({ Given, And, When, Then }) => {
    Given('a Neo4j database is available', () => {
      if (!serverRunning) return
      expect(driver).toBeDefined()
    })

    And('the "Backend Team" approves "Node.js" version "18" with status "approved"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MERGE (team:Team {name: $teamName})
          MERGE (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            version: $version,
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Node.js', version: '18', status: 'approved' })
      } finally {
        await session.close()
      }
    })

    And('the "Frontend Team" approves "Node.js" version "16" with status "approved"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MERGE (team:Team {name: $teamName})
          MERGE (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            version: $version,
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Frontend Team', techName: 'Node.js', version: '16', status: 'approved' })
      } finally {
        await session.close()
      }
    })

    When('I query "Backend Team" approval for "Node.js" version "18"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          WHERE r.version = $version
          RETURN r.status as status
        `, { teamName: 'Backend Team', techName: 'Node.js', version: '18' })
        
        approvalStatus = result.records.length > 0 ? result.records[0].get('status') : 'restricted'
      } finally {
        await session.close()
      }
    })

    Then('the Backend Team status should be "approved"', () => {
      if (!serverRunning) return
      expect(approvalStatus).toBe('approved')
    })

    When('I query "Frontend Team" approval for "Node.js" version "16"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          WHERE r.version = $version
          RETURN r.status as status
        `, { teamName: 'Frontend Team', techName: 'Node.js', version: '16' })
        
        approvalStatus = result.records.length > 0 ? result.records[0].get('status') : 'restricted'
      } finally {
        await session.close()
      }
    })

    Then('the Frontend Team status should be "approved"', () => {
      if (!serverRunning) return
      expect(approvalStatus).toBe('approved')
    })
  })

  Scenario('Version-specific approval overrides technology-level approval', ({ Given, And, When, Then }) => {
    Given('a Neo4j database is available', () => {
      if (!serverRunning) return
      expect(driver).toBeDefined()
    })

    And('the "Backend Team" approves "Java" with status "approved"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        // Technology-level approval (no version specified)
        await session.run(`
          MERGE (team:Team {name: $teamName})
          MERGE (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Java', status: 'approved' })
      } finally {
        await session.close()
      }
    })

    And('the "Backend Team" approves "Java" version "8" with status "deprecated"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        // Version-specific approval overrides technology-level
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            version: $version,
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Java', version: '8', status: 'deprecated' })
      } finally {
        await session.close()
      }
    })

    When('I query "Backend Team" approval for "Java" version "8"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        // Check for version-specific approval first, then fall back to technology-level
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          WHERE r.version = $version OR r.version IS NULL
          RETURN r.status as status, r.version as version
          ORDER BY r.version DESC NULLS LAST
        `, { teamName: 'Backend Team', techName: 'Java', version: '8' })
        
        if (result.records.length > 0) {
          // First record will be version-specific if it exists (due to ORDER BY)
          approvalStatus = result.records[0].get('status')
        } else {
          approvalStatus = 'restricted'
        }
      } finally {
        await session.close()
      }
    })

    Then('the status should be "deprecated"', () => {
      if (!serverRunning) return
      expect(approvalStatus).toBe('deprecated')
    })

    When('I query "Backend Team" approval for "Java" version "17"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        // Check for version-specific approval first, then fall back to technology-level
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          WHERE r.version = $version OR r.version IS NULL
          RETURN r.status as status, r.version as version
          ORDER BY r.version DESC NULLS LAST
        `, { teamName: 'Backend Team', techName: 'Java', version: '17' })
        
        if (result.records.length > 0) {
          // No version-specific approval for 17, so technology-level applies
          approvalStatus = result.records[0].get('status')
        } else {
          approvalStatus = 'restricted'
        }
      } finally {
        await session.close()
      }
    })

    Then('the status should be "approved"', () => {
      if (!serverRunning) return
      expect(approvalStatus).toBe('approved')
    })
  })

  Scenario('Find systems using deprecated versions', ({ Given, And, When, Then }) => {
    Given('a Neo4j database is available', () => {
      if (!serverRunning) return
      expect(driver).toBeDefined()
    })

    And('the "Backend Team" approves "Java" version "8" with status "deprecated"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MERGE (team:Team {name: $teamName})
          MERGE (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            version: $version,
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Java', version: '8', status: 'deprecated' })
      } finally {
        await session.close()
      }
    })

    And('system "Legacy API" uses "Java" version "8"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MERGE (system:System {name: $systemName})
          MERGE (tech:Technology {name: $techName})
          CREATE (system)-[r:USES {
            version: $version
          }]->(tech)
        `, { systemName: 'Legacy API', techName: 'Java', version: '8' })
      } finally {
        await session.close()
      }
    })

    When('I query systems using deprecated versions', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (system:System)-[uses:USES]->(tech:Technology)
          MATCH (team:Team)-[approval:APPROVES]->(tech)
          WHERE uses.version = approval.version 
            AND approval.status = 'deprecated'
          RETURN system.name as systemName, tech.name as techName, 
                 uses.version as version, approval.status as status
        `)
        
        systemsResult = result.records
      } finally {
        await session.close()
      }
    })

    Then('"Legacy API" should be in the results', () => {
      if (!serverRunning) return
      expect(systemsResult.length).toBeGreaterThan(0)
      const legacyAPI = systemsResult.find(r => r.get('systemName') === 'Legacy API')
      expect(legacyAPI).toBeDefined()
      expect(legacyAPI!.get('techName')).toBe('Java')
      expect(legacyAPI!.get('version')).toBe('8')
      expect(legacyAPI!.get('status')).toBe('deprecated')
    })
  })

  // Additional scenarios would be implemented here following the same pattern
})
