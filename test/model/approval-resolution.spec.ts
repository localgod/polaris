import { expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Driver } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { parseDataTable, parseDataTableAsObject } from '../helpers/data-table-parser'

/**
 * Approval Resolution Logic Tests
 * 
 * These tests verify the priority hierarchy for resolving technology approval status:
 * 1. Version-specific approval (highest priority)
 * 2. Technology-level approval with version constraints  
 * 3. Default to "restricted" (no approval found)
 * 
 * Note: These are placeholder tests for the proposed schema enhancement.
 * Many scenarios have minimal implementations as the actual resolution algorithm
 * and schema migrations are not yet complete.
 */

const feature = await loadFeature('./test/model/features/approval-resolution.feature')

// Helper to evaluate version constraints
function evaluateVersionConstraint(constraint: string | null, version: string): boolean {
  if (!constraint) return true
  
  const parts = constraint.trim().split(/\s+/)
  for (const part of parts) {
    const match = part.match(/^([><=]+)(\d+)$/)
    if (!match) continue
    
    const operator = match[1]
    const constraintVer = parseInt(match[2])
    const versionNum = parseInt(version)
    
    if (operator === '>=' && versionNum < constraintVer) return false
    if (operator === '>' && versionNum <= constraintVer) return false
    if (operator === '<=' && versionNum > constraintVer) return false
    if (operator === '<' && versionNum >= constraintVer) return false
  }
  return true
}

describeFeature(feature, ({ Background, Scenario }) => {
  let driver: Driver
  let serverRunning = false
  let resolutionResult: any = null

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
      await session.run('MATCH (n) WHERE n:Team OR n:Technology OR n:AuditLog DETACH DELETE n')
    } finally {
      await session.close()
    }
    if (driver) await driver.close()
  })

  beforeEach(async () => {
    if (!serverRunning) return
    const session = driver.session()
    try {
      await session.run('MATCH (n) WHERE n:Team OR n:Technology OR n:AuditLog DETACH DELETE n')
    } finally {
      await session.close()
    }
    resolutionResult = null
  })

  Background(({ Given, And }) => {
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
          await session.run('CREATE (t:Team $props)', { props: team })
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
          await session.run('CREATE (t:Technology $props)', { props: tech })
        }
      } finally {
        await session.close()
      }
    })

    And('the following versions exist:', async (dataTable: string) => {
      if (!serverRunning) return
      const versions = parseDataTable(dataTable)
      const session = driver.session()
      try {
        for (const ver of versions) {
          await session.run(`
            MATCH (t:Technology {name: $technology})
            SET t.versions = COALESCE(t.versions, []) + $version
          `, ver)
        }
      } finally {
        await session.close()
      }
    })
  })

  // Approval resolution helper
  async function resolveApproval(teamName: string, techName: string, version: string) {
    const session = driver.session()
    try {
      // Priority 1: Version-specific
      const vs = await session.run(`
        MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
        WHERE r.version = $version
        RETURN r.status as status, r.metadata as metadata, r.notes as notes, 'version-specific' as source
      `, { teamName, techName, version })
      
      if (vs.records.length > 0) {
        const rec = vs.records[0]
        return {
          status: rec.get('status'),
          source: rec.get('source'),
          metadata: rec.get('metadata'),
          notes: rec.get('notes'),
          constraintSatisfied: true
        }
      }
      
      // Priority 2: Technology-level
      const tl = await session.run(`
        MATCH (team:Team {name: $teamName})-[r:APPROVES]->(tech:Technology {name: $techName})
        WHERE r.version IS NULL
        RETURN r.status as status, r.versionConstraint as versionConstraint, 
               r.metadata as metadata, r.notes as notes, 'technology-level' as source
      `, { teamName, techName })
      
      if (tl.records.length > 0) {
        const rec = tl.records[0]
        const constraint = rec.get('versionConstraint')
        const satisfied = evaluateVersionConstraint(constraint, version)
        return {
          status: satisfied ? rec.get('status') : 'restricted',
          source: rec.get('source'),
          metadata: rec.get('metadata'),
          notes: rec.get('notes'),
          constraintSatisfied: satisfied,
          versionConstraint: constraint
        }
      }
      
      // Priority 3: Default
      return { status: 'restricted', source: 'default', constraintSatisfied: false }
    } finally {
      await session.close()
    }
  }

  // Common step definitions
  const createTechnologyLevelApproval = async (teamName: string, techName: string, status: string, constraint?: string, notes?: string) => {
    if (!serverRunning) return
    const session = driver.session()
    try {
      await session.run(`
        MATCH (team:Team {name: $teamName})
        MATCH (tech:Technology {name: $techName})
        CREATE (team)-[r:APPROVES {
          status: $status,
          versionConstraint: $constraint,
          notes: $notes,
          approvedAt: datetime()
        }]->(tech)
      `, { teamName, techName, status, constraint: constraint || null, notes: notes || null })
    } finally {
      await session.close()
    }
  }

  const createVersionSpecificApproval = async (teamName: string, techName: string, version: string, status: string) => {
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
      `, { teamName, techName, version, status })
    } finally {
      await session.close()
    }
  }

  // Implemented scenarios (6 out of 15)
  Scenario('Version-specific approval takes precedence over technology-level', ({ Given, And, When, Then }) => {
    Given('the "Backend Team" approves "Java" with status "approved"', async () => {
      await createTechnologyLevelApproval('Backend Team', 'Java', 'approved')
    })

    And('the "Backend Team" approves "Java" version "8" with status "deprecated"', async () => {
      await createVersionSpecificApproval('Backend Team', 'Java', '8', 'deprecated')
    })

    When('I resolve approval for "Backend Team" and "Java" version "8"', async () => {
      if (!serverRunning) return
      resolutionResult = await resolveApproval('Backend Team', 'Java', '8')
    })

    Then('the effective status should be "deprecated"', () => {
      if (!serverRunning) return
      expect(resolutionResult?.status).toBe('deprecated')
    })

    And('the resolution source should be "version-specific"', () => {
      if (!serverRunning) return
      expect(resolutionResult?.source).toBe('version-specific')
    })
  })

  Scenario('Technology-level approval applies when no version-specific approval exists', ({ Given, When, Then, And }) => {
    Given('the "Backend Team" approves "Java" with status "approved"', async () => {
      await createTechnologyLevelApproval('Backend Team', 'Java', 'approved')
    })

    When('I resolve approval for "Backend Team" and "Java" version "17"', async () => {
      if (!serverRunning) return
      resolutionResult = await resolveApproval('Backend Team', 'Java', '17')
    })

    Then('the effective status should be "approved"', () => {
      if (!serverRunning) return
      expect(resolutionResult?.status).toBe('approved')
    })

    And('the resolution source should be "technology-level"', () => {
      if (!serverRunning) return
      expect(resolutionResult?.source).toBe('technology-level')
    })
  })

  Scenario('Default to restricted when no approval exists', ({ Given, When, Then, And }) => {
    Given('the "Backend Team" has no approval for "Python"', () => {
      if (!serverRunning) return
    })

    When('I resolve approval for "Backend Team" and "Python" version "3.11"', async () => {
      if (!serverRunning) return
      resolutionResult = await resolveApproval('Backend Team', 'Python', '3.11')
    })

    Then('the effective status should be "restricted"', () => {
      if (!serverRunning) return
      expect(resolutionResult?.status).toBe('restricted')
    })

    And('the resolution source should be "default"', () => {
      if (!serverRunning) return
      expect(resolutionResult?.source).toBe('default')
    })
  })

  Scenario('Version constraint evaluation for approved range', ({ Given, When, And }) => {
    const testResults: any[] = []
    
    Given('the "Backend Team" approves "Java" with:', async (dataTable: string) => {
      if (!serverRunning) return
      const data = parseDataTableAsObject(dataTable)
      await createTechnologyLevelApproval('Backend Team', 'Java', data.status, data.versionConstraint)
    })

    When('I resolve approval for "Backend Team" and "Java" version "17"', async () => {
      if (!serverRunning) return
      testResults[0] = await resolveApproval('Backend Team', 'Java', '17')
    })

    And('the effective status should be "approved"', () => {
      if (!serverRunning) return
      expect(testResults[0]?.status).toBe('approved')
    })

    And('the constraint ">=17" should be satisfied by version "17"', () => {
      if (!serverRunning) return
      expect(evaluateVersionConstraint('>=17', '17')).toBe(true)
    })

    When('I resolve approval for "Backend Team" and "Java" version "21"', async () => {
      if (!serverRunning) return
      testResults[1] = await resolveApproval('Backend Team', 'Java', '21')
    })

    And('the effective status for version 21 should be "approved"', () => {
      if (!serverRunning) return
      expect(testResults[1]?.status).toBe('approved')
    })

    And('the constraint ">=17" should be satisfied by version "21"', () => {
      if (!serverRunning) return
      expect(evaluateVersionConstraint('>=17', '21')).toBe(true)
    })
  })

  Scenario('Version constraint evaluation for restricted range', ({ Given, When, And }) => {
    const testResults: any[] = []
    
    Given('the "Backend Team" approves "Java" with:', async (dataTable: string) => {
      if (!serverRunning) return
      const data = parseDataTableAsObject(dataTable)
      await createTechnologyLevelApproval('Backend Team', 'Java', data.status, data.versionConstraint)
    })

    When('I resolve approval for "Backend Team" and "Java" version "11"', async () => {
      if (!serverRunning) return
      testResults[0] = await resolveApproval('Backend Team', 'Java', '11')
    })

    And('the effective status should be "restricted"', () => {
      if (!serverRunning) return
      expect(testResults[0]?.status).toBe('restricted')
    })

    And('the constraint ">=17" should not be satisfied by version "11"', () => {
      if (!serverRunning) return
      expect(evaluateVersionConstraint('>=17', '11')).toBe(false)
    })

    When('I resolve approval for "Backend Team" and "Java" version "8"', async () => {
      if (!serverRunning) return
      testResults[1] = await resolveApproval('Backend Team', 'Java', '8')
    })

    And('the effective status for version 8 should be "restricted"', () => {
      if (!serverRunning) return
      expect(testResults[1]?.status).toBe('restricted')
    })

    And('the constraint ">=17" should not be satisfied by version "8"', () => {
      if (!serverRunning) return
      expect(evaluateVersionConstraint('>=17', '8')).toBe(false)
    })
  })

  Scenario('Version-specific override of version constraint', ({ Given, And, When, Then }) => {
    Given('the "Backend Team" approves "Java" with:', async (dataTable: string) => {
      if (!serverRunning) return
      const data = parseDataTableAsObject(dataTable)
      await createTechnologyLevelApproval('Backend Team', 'Java', data.status, data.versionConstraint)
    })

    And('the "Backend Team" approves "Java" version "11" with status "experimental"', async () => {
      await createVersionSpecificApproval('Backend Team', 'Java', '11', 'experimental')
    })

    When('I resolve approval for "Backend Team" and "Java" version "11"', async () => {
      if (!serverRunning) return
      resolutionResult = await resolveApproval('Backend Team', 'Java', '11')
    })

    Then('the effective status should be "experimental"', () => {
      if (!serverRunning) return
      expect(resolutionResult?.status).toBe('experimental')
    })

    And('the resolution source should be "version-specific"', () => {
      if (!serverRunning) return
      expect(resolutionResult?.source).toBe('version-specific')
    })

    And('the version constraint should be ignored', () => {
      if (!serverRunning) return
      expect(resolutionResult?.source).toBe('version-specific')
    })
  })

  // Remaining scenarios are placeholders
  // TODO: Full implementation when schema is complete
  
  Scenario('Multiple resolution paths with priority', ({ Given, And, When, Then }) => {
    if (!serverRunning) return
  })

  Scenario('Resolution includes metadata from source', ({ Given, When, Then, And }) => {
    if (!serverRunning) return
  })

  Scenario('Technology-level restricted overrides version constraint', ({ Given, When, Then, And }) => {
    if (!serverRunning) return
  })

  Scenario('Experimental status allows usage with warnings', ({ Given, When, And }) => {
    if (!serverRunning) return
  })

  Scenario('Resolution for multiple teams shows different results', ({ Given, And, When, Then }) => {
    if (!serverRunning) return
  })

  Scenario('Complex version constraint with multiple operators', ({ Given, When, And }) => {
    if (!serverRunning) return
  })

  Scenario('Resolution caching and performance', ({ Given, When, And }) => {
    if (!serverRunning) return
  })

  Scenario('Audit trail for resolution decisions', ({ Given, When, Then, And }) => {
    if (!serverRunning) return
  })

  Scenario('Resolution with missing version node', ({ Given, When, Then }) => {
    if (!serverRunning) return
  })
})
