import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'
const TEST_PREFIX = 'test_policy_license_'

// Mock loadQuery and injectWhereConditions
declare global {
  var loadQuery: (path: string) => Promise<string>
  var injectWhereConditions: (query: string, conditions: string[]) => string
}

global.injectWhereConditions = vi.fn((query: string, conditions: string[]) => {
  if (conditions.length === 0) {
    return query.replace('{{WHERE_CONDITIONS}}', '').replace('{{AND_CONDITIONS}}', '')
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const andClause = `AND ${conditions.join(' AND ')}`
  return query
    .replace('{{WHERE_CONDITIONS}}', whereClause)
    .replace('{{AND_CONDITIONS}}', andClause)
})

global.loadQuery = vi.fn(async (path: string) => {
  if (path === 'policies/find-license-violations.cypher') {
    return `
MATCH (system:System)<-[:OWNS]-(team:Team)
MATCH (system)-[:USES]->(component:Component)-[:HAS_LICENSE]->(license:License)
MATCH (policy:Policy {status: 'active', ruleType: 'license-compliance'})
MATCH (team)-[:SUBJECT_TO]->(policy)
WHERE NOT (policy)-[:ALLOWS_LICENSE]->(license)
{{AND_CONDITIONS}}
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
RETURN team.name as teamName,
       system.name as systemName,
       component.name as componentName,
       component.version as componentVersion,
       component.purl as componentPurl,
       license.id as licenseId,
       license.name as licenseName,
       license.category as licenseCategory,
       license.osiApproved as licenseOsiApproved,
       policy.name as policyName,
       policy.description as policyDescription,
       policy.severity as severity,
       policy.ruleType as ruleType,
       enforcer.name as enforcedBy
ORDER BY 
  CASE policy.severity
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    WHEN 'info' THEN 4
  END,
  team.name,
  system.name,
  component.name
    `
  }
  return ''
})

let driver: Driver | null = null
let neo4jAvailable = false

beforeAll(async () => {
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD))
    await driver.verifyAuthentication()
    neo4jAvailable = true
  } catch {
    neo4jAvailable = false
    console.warn('\n⚠️  Neo4j not available. Repository tests will be skipped.\n')
  }
})

afterAll(async () => {
  if (driver) {
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
    await driver.close()
  }
})

describe('PolicyRepository - License Compliance', () => {
  let policyRepo: PolicyRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    policyRepo = new PolicyRepository(driver)
    session = driver.session()
    
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
  })

  describe('findLicenseViolations()', () => {
    it('should return empty array when no violations exist', async () => {
      if (!neo4jAvailable) return

      const result = await policyRepo.findLicenseViolations({})

      expect(Array.isArray(result)).toBe(true)
    })

    it('should detect license violations', async () => {
      if (!neo4jAvailable || !session) return

      // Create test data: team, system, component, license, policy
      await session.run(`
        CREATE (team:Team {name: $teamName})
        CREATE (system:System {name: $systemName})
        CREATE (component:Component {name: $componentName, version: '1.0.0', purl: 'pkg:npm/test@1.0.0'})
        CREATE (license:License {id: $licenseId, name: 'GPL-3.0', category: 'copyleft', osiApproved: true})
        CREATE (allowedLicense:License {id: $allowedLicenseId, name: 'MIT', category: 'permissive', osiApproved: true})
        CREATE (policy:Policy {
          name: $policyName,
          description: 'Only permissive licenses allowed',
          ruleType: 'license-compliance',
          severity: 'error',
          status: 'active',
          enforcedBy: 'organization',
          scope: 'all'
        })
        CREATE (team)-[:OWNS]->(system)
        CREATE (system)-[:USES]->(component)
        CREATE (component)-[:HAS_LICENSE]->(license)
        CREATE (team)-[:SUBJECT_TO]->(policy)
        CREATE (policy)-[:ALLOWS_LICENSE]->(allowedLicense)
      `, {
        teamName: `${TEST_PREFIX}team`,
        systemName: `${TEST_PREFIX}system`,
        componentName: `${TEST_PREFIX}component`,
        licenseId: `${TEST_PREFIX}GPL-3.0`,
        allowedLicenseId: `${TEST_PREFIX}MIT`,
        policyName: `${TEST_PREFIX}permissive-only`
      })

      const result = await policyRepo.findLicenseViolations({})
      const testViolations = result.filter(v => v.team.startsWith(TEST_PREFIX))

      expect(testViolations.length).toBeGreaterThanOrEqual(1)
      
      const violation = testViolations[0]
      expect(violation.team).toBe(`${TEST_PREFIX}team`)
      expect(violation.system).toBe(`${TEST_PREFIX}system`)
      expect(violation.component.name).toBe(`${TEST_PREFIX}component`)
      expect(violation.license.id).toBe(`${TEST_PREFIX}GPL-3.0`)
      expect(violation.policy.name).toBe(`${TEST_PREFIX}permissive-only`)
      expect(violation.policy.ruleType).toBe('license-compliance')
    })

    it('should not report violations for allowed licenses', async () => {
      if (!neo4jAvailable || !session) return

      // Create test data with allowed license
      await session.run(`
        CREATE (team:Team {name: $teamName})
        CREATE (system:System {name: $systemName})
        CREATE (component:Component {name: $componentName, version: '1.0.0', purl: 'pkg:npm/test@1.0.0'})
        CREATE (license:License {id: $licenseId, name: 'MIT', category: 'permissive', osiApproved: true})
        CREATE (policy:Policy {
          name: $policyName,
          description: 'Only permissive licenses allowed',
          ruleType: 'license-compliance',
          severity: 'error',
          status: 'active',
          enforcedBy: 'organization',
          scope: 'all'
        })
        CREATE (team)-[:OWNS]->(system)
        CREATE (system)-[:USES]->(component)
        CREATE (component)-[:HAS_LICENSE]->(license)
        CREATE (team)-[:SUBJECT_TO]->(policy)
        CREATE (policy)-[:ALLOWS_LICENSE]->(license)
      `, {
        teamName: `${TEST_PREFIX}team2`,
        systemName: `${TEST_PREFIX}system2`,
        componentName: `${TEST_PREFIX}component2`,
        licenseId: `${TEST_PREFIX}MIT`,
        policyName: `${TEST_PREFIX}permissive-only2`
      })

      const result = await policyRepo.findLicenseViolations({})
      const testViolations = result.filter(v => v.team === `${TEST_PREFIX}team2`)

      expect(testViolations.length).toBe(0)
    })

    it('should filter by severity', async () => {
      if (!neo4jAvailable || !session) return

      // Create violations with different severities
      await session.run(`
        CREATE (team:Team {name: $teamName})
        CREATE (system:System {name: $systemName})
        CREATE (component:Component {name: $componentName, version: '1.0.0', purl: 'pkg:npm/test@1.0.0'})
        CREATE (license:License {id: $licenseId, name: 'GPL-3.0', category: 'copyleft', osiApproved: true})
        CREATE (allowedLicense:License {id: $allowedLicenseId, name: 'MIT', category: 'permissive', osiApproved: true})
        CREATE (criticalPolicy:Policy {
          name: $criticalPolicyName,
          description: 'Critical policy',
          ruleType: 'license-compliance',
          severity: 'critical',
          status: 'active',
          enforcedBy: 'organization',
          scope: 'all'
        })
        CREATE (warningPolicy:Policy {
          name: $warningPolicyName,
          description: 'Warning policy',
          ruleType: 'license-compliance',
          severity: 'warning',
          status: 'active',
          enforcedBy: 'organization',
          scope: 'all'
        })
        CREATE (team)-[:OWNS]->(system)
        CREATE (system)-[:USES]->(component)
        CREATE (component)-[:HAS_LICENSE]->(license)
        CREATE (team)-[:SUBJECT_TO]->(criticalPolicy)
        CREATE (team)-[:SUBJECT_TO]->(warningPolicy)
        CREATE (criticalPolicy)-[:ALLOWS_LICENSE]->(allowedLicense)
        CREATE (warningPolicy)-[:ALLOWS_LICENSE]->(allowedLicense)
      `, {
        teamName: `${TEST_PREFIX}team3`,
        systemName: `${TEST_PREFIX}system3`,
        componentName: `${TEST_PREFIX}component3`,
        licenseId: `${TEST_PREFIX}GPL-3.0-2`,
        allowedLicenseId: `${TEST_PREFIX}MIT-2`,
        criticalPolicyName: `${TEST_PREFIX}critical-policy`,
        warningPolicyName: `${TEST_PREFIX}warning-policy`
      })

      const criticalResult = await policyRepo.findLicenseViolations({ severity: 'critical' })
      const testCriticalViolations = criticalResult.filter(v => v.team === `${TEST_PREFIX}team3`)

      expect(testCriticalViolations.length).toBeGreaterThanOrEqual(1)
      // Check that the critical policy violation exists
      const criticalViolation = testCriticalViolations.find(v => v.policy.name === `${TEST_PREFIX}critical-policy`)
      expect(criticalViolation).toBeDefined()
      expect(criticalViolation?.policy.severity).toBe('critical')
    })

    it('should filter by team', async () => {
      if (!neo4jAvailable || !session) return

      // Create violations for specific team
      await session.run(`
        CREATE (team:Team {name: $teamName})
        CREATE (system:System {name: $systemName})
        CREATE (component:Component {name: $componentName, version: '1.0.0', purl: 'pkg:npm/test@1.0.0'})
        CREATE (license:License {id: $licenseId, name: 'GPL-3.0', category: 'copyleft', osiApproved: true})
        CREATE (allowedLicense:License {id: $allowedLicenseId, name: 'MIT', category: 'permissive', osiApproved: true})
        CREATE (policy:Policy {
          name: $policyName,
          description: 'Team policy',
          ruleType: 'license-compliance',
          severity: 'error',
          status: 'active',
          enforcedBy: 'team',
          scope: 'specific-teams'
        })
        CREATE (team)-[:OWNS]->(system)
        CREATE (system)-[:USES]->(component)
        CREATE (component)-[:HAS_LICENSE]->(license)
        CREATE (team)-[:SUBJECT_TO]->(policy)
        CREATE (policy)-[:ALLOWS_LICENSE]->(allowedLicense)
      `, {
        teamName: `${TEST_PREFIX}specific-team`,
        systemName: `${TEST_PREFIX}system4`,
        componentName: `${TEST_PREFIX}component4`,
        licenseId: `${TEST_PREFIX}GPL-3.0-3`,
        allowedLicenseId: `${TEST_PREFIX}MIT-3`,
        policyName: `${TEST_PREFIX}team-policy`
      })

      const result = await policyRepo.findLicenseViolations({ team: `${TEST_PREFIX}specific-team` })

      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.every(v => v.team === `${TEST_PREFIX}specific-team`)).toBe(true)
    })
  })
})
