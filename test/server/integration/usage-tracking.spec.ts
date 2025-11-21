import { expect, beforeAll } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import neo4j from 'neo4j-driver'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'

let driver: neo4j.Driver | null = null
let neo4jAvailable = false

beforeAll(async () => {
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD))
    await driver.verifyConnectivity()
    neo4jAvailable = true
  } catch {
    neo4jAvailable = false
  }
})

const feature = await loadFeature('./test/server/integration/features/usage-tracking.feature')

describeFeature(feature, ({ Scenario }) => {
  Scenario('Team USES relationship is created from system ownership', ({ Given, When, Then, And }) => {
    let session: neo4j.Session | null = null

    Given('a Neo4j database is available', () => {
      if (!neo4jAvailable || !driver) return
      expect(driver).toBeDefined()
    })

    And('the database has been seeded with test data', async () => {
      if (!neo4jAvailable || !driver) return
      session = driver.session()
      
      // Clean up test data
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
    })

    And('a team "Frontend Platform" owns a system "Customer Portal"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MERGE (team:Team {name: 'Frontend Platform Test', testData: true})
        MERGE (sys:System {name: 'Customer Portal Test', testData: true})
        MERGE (team)-[:OWNS]->(sys)
      `)
    })

    And('the system "Customer Portal" uses component "react@18.2.0"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MATCH (sys:System {name: 'Customer Portal Test', testData: true})
        MERGE (comp:Component {
          name: 'react-test', 
          version: '18.2.0', 
          packageManager: 'npm',
          purl: 'pkg:npm/react-test@18.2.0',
          testData: true
        })
        MERGE (sys)-[:USES]->(comp)
      `)
    })

    And('the component "react@18.2.0" is a version of technology "React"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MATCH (comp:Component {version: '18.2.0', testData: true})
        MERGE (tech:Technology {name: 'React Test', testData: true})
        MERGE (comp)-[:IS_VERSION_OF]->(tech)
      `)
    })

    When('the USES relationships are created', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MATCH (team:Team {testData: true})-[:OWNS]->(sys:System)
        MATCH (sys)-[:USES]->(comp:Component)
        MATCH (comp)-[:IS_VERSION_OF]->(tech:Technology)
        WITH team, tech, count(DISTINCT sys) as systemCount
        MERGE (team)-[u:USES]->(tech)
        SET u.systemCount = systemCount,
            u.lastVerified = datetime()
      `)
    })

    Then('the team "Frontend Platform" should have a USES relationship to "React"', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {name: 'Frontend Platform Test', testData: true})-[u:USES]->(tech:Technology {name: 'React Test'})
        RETURN u
      `)
      
      expect(result.records.length).toBe(1)
    })

    And('the USES relationship should have property "systemCount" equal to 1', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {name: 'Frontend Platform Test', testData: true})-[u:USES]->(tech:Technology {name: 'React Test'})
        RETURN u.systemCount as systemCount
      `)
      
      expect(result.records[0].get('systemCount').toNumber()).toBe(1)
      
      // Cleanup
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
      await session.close()
    })
  })

  Scenario('USES relationship tracks multiple systems', ({ Given, When, Then, And }) => {
    let session: neo4j.Session | null = null

    Given('a Neo4j database is available', () => {
      if (!neo4jAvailable || !driver) return
      expect(driver).toBeDefined()
    })

    And('the database has been seeded with test data', async () => {
      if (!neo4jAvailable || !driver) return
      session = driver.session()
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
    })

    And('a team "Backend Platform" owns systems "API Gateway" and "Auth Service"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MERGE (team:Team {name: 'Backend Platform Test', testData: true})
        MERGE (sys1:System {name: 'API Gateway Test', testData: true})
        MERGE (sys2:System {name: 'Auth Service Test', testData: true})
        MERGE (team)-[:OWNS]->(sys1)
        MERGE (team)-[:OWNS]->(sys2)
      `)
    })

    And('both systems use components that are versions of "Node.js"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MATCH (sys1:System {name: 'API Gateway Test', testData: true})
        MATCH (sys2:System {name: 'Auth Service Test', testData: true})
        MERGE (comp1:Component {
          name: 'node-test', 
          version: '20.0.0', 
          packageManager: 'system',
          purl: 'pkg:generic/node-test@20.0.0',
          testData: true
        })
        MERGE (comp2:Component {
          name: 'node-test', 
          version: '20.1.0', 
          packageManager: 'system',
          purl: 'pkg:generic/node-test@20.1.0',
          testData: true
        })
        MERGE (tech:Technology {name: 'Node.js Test', testData: true})
        MERGE (sys1)-[:USES]->(comp1)
        MERGE (sys2)-[:USES]->(comp2)
        MERGE (comp1)-[:IS_VERSION_OF]->(tech)
        MERGE (comp2)-[:IS_VERSION_OF]->(tech)
      `)
    })

    When('the USES relationships are created', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MATCH (team:Team {testData: true})-[:OWNS]->(sys:System)
        MATCH (sys)-[:USES]->(comp:Component)
        MATCH (comp)-[:IS_VERSION_OF]->(tech:Technology)
        WITH team, tech, count(DISTINCT sys) as systemCount
        MERGE (team)-[u:USES]->(tech)
        SET u.systemCount = systemCount,
            u.lastVerified = datetime()
      `)
    })

    Then('the team "Backend Platform" should have a USES relationship to "Node.js"', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {name: 'Backend Platform Test', testData: true})-[u:USES]->(tech:Technology {name: 'Node.js Test'})
        RETURN u
      `)
      
      expect(result.records.length).toBe(1)
    })

    And('the USES relationship should have property "systemCount" equal to 2', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {name: 'Backend Platform Test', testData: true})-[u:USES]->(tech:Technology {name: 'Node.js Test'})
        RETURN u.systemCount as systemCount
      `)
      
      expect(result.records[0].get('systemCount').toNumber()).toBe(2)
      
      // Cleanup
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
      await session.close()
    })
  })

  Scenario('Find teams using unapproved technologies', ({ Given, When, Then, And, But }) => {
    let session: neo4j.Session | null = null
    let violations: Array<{ team: string; technology: string; violationType: string }> = []

    Given('a Neo4j database is available', () => {
      if (!neo4jAvailable || !driver) return
      expect(driver).toBeDefined()
    })

    And('the database has been seeded with test data', async () => {
      if (!neo4jAvailable || !driver) return
      session = driver.session()
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
    })

    And('a team "Data Platform" uses technology "Python"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MERGE (team:Team {name: 'Data Platform Test', testData: true})
        MERGE (tech:Technology {name: 'Python Test', testData: true})
        MERGE (team)-[u:USES]->(tech)
        ON CREATE SET u.systemCount = 1, u.firstUsed = datetime(), u.lastVerified = datetime()
      `)
    })

    But('the team "Data Platform" has not approved "Python"', () => {
      if (!neo4jAvailable) return
      // No APPROVES relationship created
      expect(true).toBe(true)
    })

    When('I query for compliance violations', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {testData: true})-[u:USES]->(tech:Technology {testData: true})
        OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
        WITH team, tech, a
        WHERE a IS NULL OR a.time = 'eliminate'
        RETURN team.name as team, tech.name as technology,
               CASE WHEN a IS NULL THEN 'unapproved' ELSE 'eliminated' END as violationType
      `)
      
      violations = result.records.map(r => ({
        team: r.get('team'),
        technology: r.get('technology'),
        violationType: r.get('violationType')
      }))
    })

    Then('"Data Platform" should appear in the violations list', () => {
      if (!neo4jAvailable) return
      const hasViolation = violations.some(v => v.team === 'Data Platform Test')
      if (!hasViolation) {
        console.warn('No violations found. Violations:', violations)
      }
      expect(hasViolation).toBe(true)
    })

    And('the violation type should be "unapproved"', async () => {
      if (!neo4jAvailable || !session) return
      
      const violation = violations.find(v => v.team === 'Data Platform Test')
      expect(violation?.violationType).toBe('unapproved')
      
      // Cleanup
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
      await session.close()
    })
  })

  Scenario('Find teams using eliminated technologies', ({ Given, When, Then, And }) => {
    let session: neo4j.Session | null = null
    let violations: Array<{ team: string; technology: string; violationType: string }> = []

    Given('a Neo4j database is available', () => {
      if (!neo4jAvailable || !driver) return
      expect(driver).toBeDefined()
    })

    And('the database has been seeded with test data', async () => {
      if (!neo4jAvailable || !driver) return
      session = driver.session()
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
    })

    And('a team "Frontend Platform" uses technology "Angular"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MERGE (team:Team {name: 'Frontend Platform Test Eliminated', testData: true})
        MERGE (tech:Technology {name: 'Angular Test', testData: true})
        MERGE (team)-[u:USES]->(tech)
        ON CREATE SET u.systemCount = 1, u.firstUsed = datetime(), u.lastVerified = datetime()
      `)
    })

    And('the team "Frontend Platform" has approved "Angular" with time "eliminate"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MATCH (team:Team {name: 'Frontend Platform Test Eliminated', testData: true})
        MATCH (tech:Technology {name: 'Angular Test', testData: true})
        MERGE (team)-[a:APPROVES]->(tech)
        SET a.time = 'eliminate', a.approvedAt = datetime()
      `)
    })

    When('I query for compliance violations', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {testData: true})-[u:USES]->(tech:Technology {testData: true})
        OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
        WITH team, tech, a
        WHERE a IS NULL OR a.time = 'eliminate'
        RETURN team.name as team, tech.name as technology,
               CASE WHEN a IS NULL THEN 'unapproved' ELSE 'eliminated' END as violationType
      `)
      
      violations = result.records.map(r => ({
        team: r.get('team'),
        technology: r.get('technology'),
        violationType: r.get('violationType')
      }))
    })

    Then('"Frontend Platform" should appear in the violations list', () => {
      if (!neo4jAvailable) return
      const hasViolation = violations.some(v => v.team.includes('Frontend Platform'))
      expect(hasViolation).toBe(true)
    })

    And('the violation type should be "eliminated"', async () => {
      if (!neo4jAvailable || !session) return
      
      const violation = violations.find(v => v.team.includes('Frontend Platform'))
      expect(violation?.violationType).toBe('eliminated')
      
      // Cleanup
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
      await session.close()
    })
  })

  Scenario('Compliant usage is not flagged as violation', ({ Given, When, Then, And }) => {
    let session: neo4j.Session | null = null
    let violations: Array<{ team: string; technology: string; violationType: string }> = []

    Given('a Neo4j database is available', () => {
      if (!neo4jAvailable || !driver) return
      expect(driver).toBeDefined()
    })

    And('the database has been seeded with test data', async () => {
      if (!neo4jAvailable || !driver) return
      session = driver.session()
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
    })

    And('a team "Backend Platform" uses technology "TypeScript"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MERGE (team:Team {name: 'Backend Platform Test Compliant'})
        SET team.testData = true
        MERGE (tech:Technology {name: 'TypeScript Test'})
        SET tech.testData = true
        MERGE (team)-[u:USES]->(tech)
        ON CREATE SET u.systemCount = 1, u.firstUsed = datetime(), u.lastVerified = datetime()
      `)
    })

    And('the team "Backend Platform" has approved "TypeScript" with time "invest"', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MATCH (team:Team {name: 'Backend Platform Test Compliant'})
        MATCH (tech:Technology {name: 'TypeScript Test'})
        MERGE (team)-[a:APPROVES]->(tech)
        SET a.time = 'invest', a.approvedAt = datetime()
      `)
    })

    When('I query for compliance violations', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {testData: true})-[u:USES]->(tech:Technology {testData: true})
        OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
        WITH team, tech, a
        WHERE a IS NULL OR a.time = 'eliminate'
        RETURN team.name as team, tech.name as technology,
               CASE WHEN a IS NULL THEN 'unapproved' ELSE 'eliminated' END as violationType
      `)
      
      violations = result.records.map(r => ({
        team: r.get('team'),
        technology: r.get('technology'),
        violationType: r.get('violationType')
      }))
    })

    Then('"Backend Platform" should not appear in the violations list', async () => {
      if (!neo4jAvailable || !session) return
      
      const hasViolation = violations.some(v => v.team.includes('Backend Platform'))
      expect(hasViolation).toBe(false)
      
      // Cleanup
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
      await session.close()
    })
  })

  Scenario('Query team usage with compliance status', ({ Given, When, Then, And }) => {
    let session: neo4j.Session | null = null
    let usage: Array<{ technology: string; complianceStatus: string }> = []
    const summary: { total: number; compliant: number; violations: number } = { total: 0, compliant: 0, violations: 0 }

    Given('a Neo4j database is available', () => {
      if (!neo4jAvailable || !driver) return
      expect(driver).toBeDefined()
    })

    And('the database has been seeded with test data', async () => {
      if (!neo4jAvailable || !driver) return
      session = driver.session()
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
    })

    And('a team "Frontend Platform" uses multiple technologies', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MERGE (team:Team {name: 'Frontend Platform Test Multi', testData: true})
        MERGE (tech1:Technology {name: 'React Test Multi', testData: true})
        MERGE (tech2:Technology {name: 'Vue Test Multi', testData: true})
        MERGE (tech3:Technology {name: 'Svelte Test Multi', testData: true})
        MERGE (team)-[u1:USES]->(tech1)
        MERGE (team)-[u2:USES]->(tech2)
        MERGE (team)-[u3:USES]->(tech3)
        ON CREATE SET u1.systemCount = 1, u2.systemCount = 1, u3.systemCount = 1
      `)
    })

    And('some are approved and some are not', async () => {
      if (!neo4jAvailable || !session) return
      
      await session.run(`
        MATCH (team:Team {name: 'Frontend Platform Test Multi', testData: true})
        MATCH (tech1:Technology {name: 'React Test Multi', testData: true})
        MATCH (tech2:Technology {name: 'Vue Test Multi', testData: true})
        MERGE (team)-[a1:APPROVES]->(tech1)
        SET a1.time = 'invest', a1.approvedAt = datetime()
        MERGE (team)-[a2:APPROVES]->(tech2)
        SET a2.time = 'eliminate', a2.approvedAt = datetime()
        // tech3 (Svelte) is not approved
      `)
    })

    When('I query the team\'s usage', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {name: 'Frontend Platform Test Multi', testData: true})-[u:USES]->(tech:Technology)
        OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
        RETURN tech.name as technology,
               CASE 
                 WHEN a IS NULL THEN 'unapproved'
                 WHEN a.time = 'eliminate' THEN 'eliminated'
                 ELSE 'compliant'
               END as complianceStatus
      `)
      
      usage = result.records.map(r => ({
        technology: r.get('technology'),
        complianceStatus: r.get('complianceStatus')
      }))
    })

    Then('I should see all used technologies', () => {
      if (!neo4jAvailable) return
      expect(usage.length).toBe(3)
    })

    And('each should have a compliance status', () => {
      if (!neo4jAvailable) return
      usage.forEach(u => {
        expect(u.complianceStatus).toBeDefined()
        expect(['compliant', 'unapproved', 'eliminated']).toContain(u.complianceStatus)
      })
    })

    And('the summary should show counts by compliance status', async () => {
      if (!neo4jAvailable || !session) return
      
      summary.total = usage.length
      summary.compliant = usage.filter(u => u.complianceStatus === 'compliant').length
      summary.violations = usage.filter(u => ['unapproved', 'eliminated'].includes(u.complianceStatus)).length
      
      expect(summary.total).toBe(3)
      expect(summary.compliant).toBe(1)
      expect(summary.violations).toBe(2)
      
      // Cleanup
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
      await session.close()
    })
  })
})
