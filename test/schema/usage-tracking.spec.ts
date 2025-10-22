import { expect, beforeAll } from 'vitest'
import { Feature } from '../helpers/gherkin'
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

Feature('Technology Usage Tracking', ({ Scenario }) => {
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
      
      // Create test data
      await session.run(`
        MERGE (team:Team {name: 'Frontend Platform Test', testData: true})
        MERGE (sys:System {name: 'Customer Portal Test', testData: true})
        MERGE (comp:Component {name: 'react-test', version: '18.2.0', packageManager: 'npm', testData: true})
        MERGE (tech:Technology {name: 'React Test', testData: true})
        MERGE (team)-[:OWNS]->(sys)
        MERGE (sys)-[:USES]->(comp)
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

    Given('a team "Backend Platform" owns systems "API Gateway" and "Auth Service"', async () => {
      if (!neo4jAvailable || !driver) return
      session = driver.session()
      
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
      
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
        MERGE (comp1:Component {name: 'node-test', version: '20.0.0', packageManager: 'system', testData: true})
        MERGE (comp2:Component {name: 'node-test', version: '20.1.0', packageManager: 'system', testData: true})
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

  Scenario('Find teams using unapproved technologies', ({ Given, When, Then, And }) => {
    let session: neo4j.Session | null = null
    let violations: Array<{ team: string; technology: string; violationType: string }> = []

    Given('a team "Data Platform" uses technology "Python"', async () => {
      if (!neo4jAvailable || !driver) return
      session = driver.session()
      
      await session.run('MATCH (n) WHERE n.testData = true DETACH DELETE n')
      
      await session.run(`
        MERGE (team:Team {name: 'Data Platform Test', testData: true})
        MERGE (tech:Technology {name: 'Python Test', testData: true})
        MERGE (team)-[u:USES {systemCount: 1}]->(tech)
      `)
    })

    And('the team "Data Platform" has not approved "Python"', () => {
      if (!neo4jAvailable) return
      // No APPROVES relationship created
      expect(true).toBe(true)
    })

    When('I query for compliance violations', async () => {
      if (!neo4jAvailable || !session) return
      
      const result = await session.run(`
        MATCH (team:Team {testData: true})-[u:USES]->(tech:Technology)
        OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
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
      expect(violations.some(v => v.team === 'Data Platform Test')).toBe(true)
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
})
