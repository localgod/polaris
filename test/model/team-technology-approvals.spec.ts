import { expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Driver, Record } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { parseDataTable } from '../helpers/data-table-parser'

/**
 * Team-Specific Technology Approvals Tests
 * 
 * These tests verify that teams can have independent approval policies
 * for technologies, allowing different teams to approve, deprecate, or
 * restrict the same technology based on their needs.
 * 
 * Note: These are placeholder tests for the proposed schema enhancement.
 * Implementation requires migration to add APPROVES relationships.
 */

const feature = await loadFeature('./test/model/features/team-technology-approvals.feature')

describeFeature(feature, ({ Scenario }) => {
  let driver: Driver
  let serverRunning = false
  let approvalResult: Record | null = null
  let approvalResults: Record[] = []

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
      // Clean up all test data
      await session.run('MATCH (n) WHERE n:Team OR n:Technology DETACH DELETE n')
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
      // Clean up test data before each scenario
      await session.run('MATCH (n) WHERE n:Team OR n:Technology DETACH DELETE n')
    } finally {
      await session.close()
    }
    
    // Reset result variables
    approvalResult = null
    approvalResults = []
  })

  Scenario('Different teams approve the same technology', ({ Given, And, When, Then }) => {
    Given('a Neo4j database is available', () => {
      if (!serverRunning) return
      expect(driver).toBeDefined()
    })

    And('the following teams exist:', async (dataTable: string) => {
      if (!serverRunning) return
      const teams = parseDataTable(dataTable)
      const session = driver.session()
      try {
        for (const team of teams) {
          await session.run(`
            CREATE (t:Team {
              name: $name,
              email: $email,
              responsibilityArea: $responsibilityArea
            })
          `, team)
        }
      } finally {
        await session.close()
      }
    })

    And('the following technologies exist:', async (dataTable: string) => {
      if (!serverRunning) return
      const technologies = parseDataTable(dataTable)
      const session = driver.session()
      try {
        for (const tech of technologies) {
          await session.run(`
            CREATE (t:Technology {
              name: $name,
              category: $category,
              description: $description
            })
          `, tech)
        }
      } finally {
        await session.close()
      }
    })
    And('the "Backend Team" approves "Java" with status "approved"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Java', status: 'approved' })
      } finally {
        await session.close()
      }
    })

    And('the "Frontend Team" approves "Java" with status "restricted"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Frontend Team', techName: 'Java', status: 'restricted' })
      } finally {
        await session.close()
      }
    })

    When('I query technology approvals for "Java"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team)-[r:APPROVES]->(tech:Technology {name: $techName})
          RETURN team.name as teamName, r.status as status
          ORDER BY team.name
        `, { techName: 'Java' })
        
        approvalResults = result.records
      } finally {
        await session.close()
      }
    })

    Then('"Backend Team" should have approval status "approved" for "Java"', () => {
      if (!serverRunning) return
      const backendApproval = approvalResults.find(r => r.get('teamName') === 'Backend Team')
      expect(backendApproval).toBeDefined()
      expect(backendApproval!.get('status')).toBe('approved')
    })

    And('"Frontend Team" should have approval status "restricted" for "Java"', () => {
      if (!serverRunning) return
      const frontendApproval = approvalResults.find(r => r.get('teamName') === 'Frontend Team')
      expect(frontendApproval).toBeDefined()
      expect(frontendApproval!.get('status')).toBe('restricted')
    })
  })

  Scenario('Team deprecates a technology while another team keeps it approved', ({ Given, And, When, Then }) => {
    Given('a Neo4j database is available', () => {
      if (!serverRunning) return
      expect(driver).toBeDefined()
    })

    And('the following teams exist:', async (dataTable: string) => {
      if (!serverRunning) return
      const teams = parseDataTable(dataTable)
      const session = driver.session()
      try {
        for (const team of teams) {
          await session.run(`
            CREATE (t:Team {
              name: $name,
              email: $email,
              responsibilityArea: $responsibilityArea
            })
          `, team)
        }
      } finally {
        await session.close()
      }
    })

    And('the following technologies exist:', async (dataTable: string) => {
      if (!serverRunning) return
      const technologies = parseDataTable(dataTable)
      const session = driver.session()
      try {
        for (const tech of technologies) {
          await session.run(`
            CREATE (t:Technology {
              name: $name,
              category: $category,
              description: $description
            })
          `, tech)
        }
      } finally {
        await session.close()
      }
    })
    And('the "Backend Team" approves "Java" with status "approved"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Java', status: 'approved' })
      } finally {
        await session.close()
      }
    })

    And('the "Frontend Team" approves "Java" with status "approved"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Frontend Team', techName: 'Java', status: 'approved' })
      } finally {
        await session.close()
      }
    })

    When('the "Frontend Team" changes "Java" approval to "deprecated" with EOL date "2025-12-31"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          SET r.status = $status,
              r.eolDate = date($eolDate),
              r.deprecatedAt = datetime()
        `, { teamName: 'Frontend Team', techName: 'Java', status: 'deprecated', eolDate: '2025-12-31' })
      } finally {
        await session.close()
      }
    })

    Then('"Backend Team" should have approval status "approved" for "Java"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          RETURN r.status as status
        `, { teamName: 'Backend Team', techName: 'Java' })
        
        expect(result.records.length).toBe(1)
        expect(result.records[0].get('status')).toBe('approved')
      } finally {
        await session.close()
      }
    })

    And('"Frontend Team" should have approval status "deprecated" for "Java"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
          RETURN r.status as status, r.eolDate as eolDate
        `, { teamName: 'Frontend Team', techName: 'Java' })
        
        approvalResult = result.records[0]
        expect(approvalResult.get('status')).toBe('deprecated')
      } finally {
        await session.close()
      }
    })

    And('"Frontend Team" approval for "Java" should have EOL date "2025-12-31"', () => {
      if (!serverRunning) return
      expect(approvalResult).toBeDefined()
      const eolDate = approvalResult!.get('eolDate')
      expect(eolDate).toBeDefined()
      expect(eolDate.toString()).toContain('2025-12-31')
    })
  })

  Scenario('Team with no approval defaults to restricted', ({ Given, And, When, Then }) => {
    Given('a Neo4j database is available', () => {
      if (!serverRunning) return
      expect(driver).toBeDefined()
    })

    And('the following teams exist:', async (dataTable: string) => {
      if (!serverRunning) return
      const teams = parseDataTable(dataTable)
      const session = driver.session()
      try {
        for (const team of teams) {
          await session.run(`
            CREATE (t:Team {
              name: $name,
              email: $email,
              responsibilityArea: $responsibilityArea
            })
          `, team)
        }
      } finally {
        await session.close()
      }
    })

    And('the following technologies exist:', async (dataTable: string) => {
      if (!serverRunning) return
      const technologies = parseDataTable(dataTable)
      const session = driver.session()
      try {
        for (const tech of technologies) {
          await session.run(`
            CREATE (t:Technology {
              name: $name,
              category: $category,
              description: $description
            })
          `, tech)
        }
      } finally {
        await session.close()
      }
    })
    And('the "Backend Team" approves "Java" with status "approved"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (tech:Technology {name: $techName})
          CREATE (team)-[r:APPROVES {
            status: $status,
            approvedAt: datetime()
          }]->(tech)
        `, { teamName: 'Backend Team', techName: 'Java', status: 'approved' })
      } finally {
        await session.close()
      }
    })

    And('the "Frontend Team" has no approval for "Java"', () => {
      if (!serverRunning) return
      // No action needed - just verify no relationship exists
    })

    When('I query "Frontend Team" approval for "Java"', async () => {
      if (!serverRunning) return
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (tech:Technology {name: $techName})
          OPTIONAL MATCH (team)-[r:APPROVES]->(tech)
          RETURN 
            CASE 
              WHEN r IS NULL THEN 'restricted'
              ELSE r.status
            END as effectiveStatus
        `, { teamName: 'Frontend Team', techName: 'Java' })
        
        approvalResult = result.records[0]
      } finally {
        await session.close()
      }
    })

    Then('the effective status should be "restricted"', () => {
      if (!serverRunning) return
      expect(approvalResult).toBeDefined()
      expect(approvalResult!.get('effectiveStatus')).toBe('restricted')
    })
  })

  // Additional scenarios would be implemented here following the same pattern
  // Each scenario from the .feature file should have a corresponding implementation
})
