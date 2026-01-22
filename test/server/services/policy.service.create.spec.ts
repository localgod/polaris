import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'
const TEST_PREFIX = 'test_policy_svc_'

// Mock loadQuery and useDriver
declare global {
  var loadQuery: (path: string) => Promise<string>
  var useDriver: () => Driver | null
  var createError: (options: { statusCode: number; message: string }) => Error & { statusCode: number }
}

let driver: Driver | null = null
let neo4jAvailable = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PolicyService: any

// Set up useDriver mock before any imports that might use it
global.useDriver = () => driver

// Mock createError globally (used by h3)
global.createError = (options: { statusCode: number; message: string }) => {
  const error = new Error(options.message) as Error & { statusCode: number }
  error.statusCode = options.statusCode
  return error
}

global.loadQuery = vi.fn(async (path: string) => {
  if (path === 'policies/find-by-name.cypher') {
    return `
MATCH (p:Policy {name: $name})
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(p)
OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
OPTIONAL MATCH (p)-[:GOVERNS]->(v:Version)
OPTIONAL MATCH (p)-[:ALLOWS_LICENSE]->(allowedLicense:License)
OPTIONAL MATCH (p)-[:DENIES_LICENSE]->(deniedLicense:License)
WITH p, enforcer,
     collect(DISTINCT subject.name) as subjectTeams,
     collect(DISTINCT tech.name) as governedTechnologies,
     collect(DISTINCT {technology: v.technologyName, version: v.version}) as governedVersions,
     collect(DISTINCT allowedLicense.id) as allowedLicenses,
     collect(DISTINCT deniedLicense.id) as deniedLicenses
RETURN p.name as name,
       p.description as description,
       p.ruleType as ruleType,
       p.severity as severity,
       p.effectiveDate as effectiveDate,
       p.expiryDate as expiryDate,
       p.enforcedBy as enforcedBy,
       p.scope as scope,
       p.status as status,
       p.licenseMode as licenseMode,
       enforcer.name as enforcerTeam,
       subjectTeams,
       governedTechnologies,
       governedVersions,
       [l IN allowedLicenses WHERE l IS NOT NULL] as allowedLicenses,
       [l IN deniedLicenses WHERE l IS NOT NULL] as deniedLicenses
    `
  }
  if (path === 'policies/check-exists.cypher') {
    return 'MATCH (p:Policy {name: $name}) RETURN p'
  }
  if (path === 'policies/delete.cypher') {
    return 'MATCH (p:Policy {name: $name}) DETACH DELETE p'
  }
  return ''
})

beforeAll(async () => {
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD))
    await driver.verifyAuthentication()
    neo4jAvailable = true
    // Update useDriver mock to return the connected driver
    global.useDriver = () => driver
    // Dynamic import after driver is set up
    const module = await import('../../../server/services/policy.service')
    PolicyService = module.PolicyService
  } catch {
    neo4jAvailable = false
    global.useDriver = () => null
    console.warn('\n⚠️  Neo4j not available. Service tests will be skipped.\n')
  }
})

afterAll(async () => {
  if (driver) {
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
    await driver.close()
  }
})

describe.sequential('PolicyService - Create Policy', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let policyService: any
  let session: Session | null = null
  let testId: string

  beforeEach(async () => {
    if (!neo4jAvailable || !driver || !PolicyService) return
    
    testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    policyService = new PolicyService()
    session = driver.session()
    
    await cleanupTestData(driver, { prefix: TEST_PREFIX, deleteAll: true })
    
    // Create test team
    await session.run(`
      MERGE (t:Team {name: $team})
    `, { team: `${TEST_PREFIX}Security` })
    
    await session.close()
  })

  describe('create() - Happy Paths', () => {
    it('should create a valid compliance policy', async () => {
      if (!neo4jAvailable || !policyService) return

      const result = await policyService.create({
        name: `${TEST_PREFIX}valid-policy-${testId}`,
        description: 'A valid test policy',
        ruleType: 'compliance',
        severity: 'warning'
      })

      expect(result.policy).toBeDefined()
      expect(result.policy.name).toBe(`${TEST_PREFIX}valid-policy-${testId}`)
      expect(result.policy.ruleType).toBe('compliance')
    })

    it('should create a license-compliance policy with denylist', async () => {
      if (!neo4jAvailable || !driver || !policyService) return

      const s = driver.session()
      await s.run(`
        CREATE (l:License {id: $license, name: 'GPL'})
      `, { license: `${TEST_PREFIX}GPL-${testId}` })
      await s.close()

      const result = await policyService.create({
        name: `${TEST_PREFIX}license-policy-${testId}`,
        ruleType: 'license-compliance',
        severity: 'error',
        licenseMode: 'denylist',
        deniedLicenses: [`${TEST_PREFIX}GPL-${testId}`]
      })

      expect(result.policy.ruleType).toBe('license-compliance')
      expect(result.policy.licenseMode).toBe('denylist')
    })
  })

  describe('create() - Validation Errors', () => {
    it('should reject duplicate policy name', async () => {
      if (!neo4jAvailable || !policyService) return

      await policyService.create({
        name: `${TEST_PREFIX}duplicate-${testId}`,
        ruleType: 'compliance',
        severity: 'warning'
      })

      await expect(
        policyService.create({
          name: `${TEST_PREFIX}duplicate-${testId}`,
          ruleType: 'compliance',
          severity: 'warning'
        })
      ).rejects.toThrow(/already exists/)
    })

    it('should reject invalid severity', async () => {
      if (!neo4jAvailable || !policyService) return

      await expect(
        policyService.create({
          name: `${TEST_PREFIX}invalid-severity-${testId}`,
          ruleType: 'compliance',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          severity: 'invalid' as any
        })
      ).rejects.toThrow(/Invalid severity/)
    })

    it('should reject invalid ruleType', async () => {
      if (!neo4jAvailable || !policyService) return

      await expect(
        policyService.create({
          name: `${TEST_PREFIX}invalid-ruletype-${testId}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ruleType: 'invalid' as any,
          severity: 'warning'
        })
      ).rejects.toThrow(/Invalid ruleType/)
    })

    it('should reject license-compliance without licenseMode', async () => {
      if (!neo4jAvailable || !policyService) return

      await expect(
        policyService.create({
          name: `${TEST_PREFIX}no-mode-${testId}`,
          ruleType: 'license-compliance',
          severity: 'error'
        })
      ).rejects.toThrow(/licenseMode/)
    })

    it('should reject denylist without deniedLicenses', async () => {
      if (!neo4jAvailable || !policyService) return

      await expect(
        policyService.create({
          name: `${TEST_PREFIX}no-denied-${testId}`,
          ruleType: 'license-compliance',
          severity: 'error',
          licenseMode: 'denylist'
        })
      ).rejects.toThrow(/deniedLicenses/)
    })

    it('should reject allowlist without allowedLicenses', async () => {
      if (!neo4jAvailable || !policyService) return

      await expect(
        policyService.create({
          name: `${TEST_PREFIX}no-allowed-${testId}`,
          ruleType: 'license-compliance',
          severity: 'error',
          licenseMode: 'allowlist'
        })
      ).rejects.toThrow(/allowedLicenses/)
    })
  })
})

describe.sequential('PolicyService - Update Status', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let policyService: any
  let testId: string

  beforeEach(async () => {
    if (!neo4jAvailable || !driver || !PolicyService) return
    
    testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    policyService = new PolicyService()
    
    await cleanupTestData(driver, { prefix: TEST_PREFIX, deleteAll: true })
    
    // Create test policy
    const session = driver.session()
    await session.run(`
      CREATE (p:Policy {
        name: $name,
        ruleType: 'compliance',
        severity: 'warning',
        status: 'active',
        scope: 'organization'
      })
    `, { name: `${TEST_PREFIX}update-status-${testId}` })
    await session.close()
  })

  describe('updateStatus() - Happy Paths', () => {
    it('should update status to draft', async () => {
      if (!neo4jAvailable || !policyService) return

      const result = await policyService.updateStatus(`${TEST_PREFIX}update-status-${testId}`, {
        status: 'draft'
      })

      expect(result.policy.status).toBe('draft')
      expect(result.previousStatus).toBe('active')
    })

    it('should update status to archived', async () => {
      if (!neo4jAvailable || !policyService) return

      const result = await policyService.updateStatus(`${TEST_PREFIX}update-status-${testId}`, {
        status: 'archived',
        reason: 'No longer needed'
      })

      expect(result.policy.status).toBe('archived')
    })
  })

  describe('updateStatus() - Validation Errors', () => {
    it('should reject invalid status', async () => {
      if (!neo4jAvailable || !policyService) return

      await expect(
        policyService.updateStatus(`${TEST_PREFIX}update-status-${testId}`, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: 'invalid' as any
        })
      ).rejects.toThrow(/Invalid status/)
    })
  })
})
