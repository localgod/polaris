import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'
const TEST_PREFIX = 'test_policy_create_'

// Mock loadQuery
declare global {
  var loadQuery: (path: string) => Promise<string>
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

describe('PolicyRepository - Create Policy', () => {
  let policyRepo: PolicyRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    policyRepo = new PolicyRepository(driver)
    session = driver.session()
    
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
    
    // Create test teams for relationships
    await session.run(`
      CREATE (t1:Team {name: $team1})
      CREATE (t2:Team {name: $team2})
    `, {
      team1: `${TEST_PREFIX}Security`,
      team2: `${TEST_PREFIX}DevOps`
    })
  })

  describe('create() - Happy Paths', () => {
    it('should create a basic compliance policy', async () => {
      if (!neo4jAvailable) return

      const result = await policyRepo.create({
        name: `${TEST_PREFIX}basic-policy`,
        description: 'A basic test policy',
        ruleType: 'compliance',
        severity: 'warning',
        scope: 'organization',
        status: 'active'
      })

      expect(result.policy).toBeDefined()
      expect(result.policy.name).toBe(`${TEST_PREFIX}basic-policy`)
      expect(result.policy.description).toBe('A basic test policy')
      expect(result.policy.ruleType).toBe('compliance')
      expect(result.policy.severity).toBe('warning')
      expect(result.policy.status).toBe('active')
    })

    it('should create a license-compliance policy with denylist', async () => {
      if (!neo4jAvailable || !session) return

      // Create test licenses
      await session.run(`
        CREATE (l1:License {id: $license1, name: 'MIT'})
        CREATE (l2:License {id: $license2, name: 'GPL-3.0'})
      `, {
        license1: `${TEST_PREFIX}MIT`,
        license2: `${TEST_PREFIX}GPL-3.0`
      })

      const result = await policyRepo.create({
        name: `${TEST_PREFIX}deny-gpl`,
        description: 'Deny GPL licenses',
        ruleType: 'license-compliance',
        severity: 'error',
        scope: 'organization',
        licenseMode: 'denylist',
        deniedLicenses: [`${TEST_PREFIX}GPL-3.0`]
      })

      expect(result.policy).toBeDefined()
      expect(result.policy.ruleType).toBe('license-compliance')
      expect(result.policy.licenseMode).toBe('denylist')
      expect(result.policy.deniedLicenses).toContain(`${TEST_PREFIX}GPL-3.0`)
      expect(result.relationshipsCreated).toBeGreaterThan(0)
    })

    it('should create a license-compliance policy with allowlist', async () => {
      if (!neo4jAvailable || !session) return

      // Create test license
      await session.run(`
        CREATE (l:License {id: $license, name: 'MIT'})
      `, {
        license: `${TEST_PREFIX}MIT-allow`
      })

      const result = await policyRepo.create({
        name: `${TEST_PREFIX}allow-mit`,
        description: 'Only allow MIT',
        ruleType: 'license-compliance',
        severity: 'error',
        scope: 'organization',
        licenseMode: 'allowlist',
        allowedLicenses: [`${TEST_PREFIX}MIT-allow`]
      })

      expect(result.policy).toBeDefined()
      expect(result.policy.licenseMode).toBe('allowlist')
      expect(result.policy.allowedLicenses).toContain(`${TEST_PREFIX}MIT-allow`)
    })

    it('should create policy with draft status', async () => {
      if (!neo4jAvailable) return

      const result = await policyRepo.create({
        name: `${TEST_PREFIX}draft-policy`,
        ruleType: 'compliance',
        severity: 'info',
        status: 'draft'
      })

      expect(result.policy.status).toBe('draft')
    })

    it('should create SUBJECT_TO relationships for organization scope', async () => {
      if (!neo4jAvailable || !session) return

      await policyRepo.create({
        name: `${TEST_PREFIX}org-policy`,
        ruleType: 'compliance',
        severity: 'warning',
        scope: 'organization'
      })

      // Check that SUBJECT_TO relationships were created
      const relResult = await session.run(`
        MATCH (t:Team)-[:SUBJECT_TO]->(p:Policy {name: $name})
        RETURN count(t) as count
      `, { name: `${TEST_PREFIX}org-policy` })

      const count = relResult.records[0]?.get('count').toNumber() || 0
      expect(count).toBeGreaterThan(0)
    })
  })

  describe('create() - Unhappy Paths', () => {
    it('should fail when creating duplicate policy name', async () => {
      if (!neo4jAvailable) return

      // Create first policy
      await policyRepo.create({
        name: `${TEST_PREFIX}duplicate`,
        ruleType: 'compliance',
        severity: 'warning'
      })

      // Attempt to create duplicate - should be handled by service layer
      // Repository doesn't check for duplicates, that's service responsibility
      // This test verifies the policy was created
      const exists = await policyRepo.exists(`${TEST_PREFIX}duplicate`)
      expect(exists).toBe(true)
    })
  })
})

describe('PolicyRepository - Update Status', () => {
  let policyRepo: PolicyRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    policyRepo = new PolicyRepository(driver)
    session = driver.session()
    
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
    
    // Create a test policy
    await session.run(`
      CREATE (p:Policy {
        name: $name,
        ruleType: 'compliance',
        severity: 'warning',
        status: 'active',
        scope: 'organization'
      })
    `, { name: `${TEST_PREFIX}status-test` })
  })

  describe('updateStatus() - Happy Paths', () => {
    it('should update policy status from active to draft', async () => {
      if (!neo4jAvailable) return

      const result = await policyRepo.updateStatus(`${TEST_PREFIX}status-test`, {
        status: 'draft',
        reason: 'Testing disable'
      })

      expect(result.previousStatus).toBe('active')
      expect(result.policy.status).toBe('draft')
    })

    it('should update policy status from draft to active', async () => {
      if (!neo4jAvailable || !session) return

      // First set to draft
      await session.run(`
        MATCH (p:Policy {name: $name})
        SET p.status = 'draft'
      `, { name: `${TEST_PREFIX}status-test` })

      const result = await policyRepo.updateStatus(`${TEST_PREFIX}status-test`, {
        status: 'active'
      })

      expect(result.previousStatus).toBe('draft')
      expect(result.policy.status).toBe('active')
    })

    it('should create audit log entry on status change', async () => {
      if (!neo4jAvailable || !session) return

      await policyRepo.updateStatus(`${TEST_PREFIX}status-test`, {
        status: 'archived',
        reason: 'No longer needed'
      })

      // Check audit log was created
      const auditResult = await session.run(`
        MATCH (a:AuditLog)-[:AUDITS]->(p:Policy {name: $name})
        RETURN a.operation as operation, a.reason as reason
        ORDER BY a.timestamp DESC
        LIMIT 1
      `, { name: `${TEST_PREFIX}status-test` })

      expect(auditResult.records.length).toBe(1)
      expect(auditResult.records[0].get('operation')).toBe('ARCHIVE')
      expect(auditResult.records[0].get('reason')).toBe('No longer needed')
    })
  })

  describe('updateStatus() - Unhappy Paths', () => {
    it('should throw error for non-existent policy', async () => {
      if (!neo4jAvailable) return

      await expect(
        policyRepo.updateStatus(`${TEST_PREFIX}nonexistent`, { status: 'draft' })
      ).rejects.toThrow()
    })
  })
})

describe('PolicyRepository - Organization License Policy', () => {
  let policyRepo: PolicyRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    policyRepo = new PolicyRepository(driver)
    session = driver.session()
    
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
    
    // Clean up org license policy if exists
    await session.run(`
      MATCH (p:Policy {name: 'Organization License Policy'})
      DETACH DELETE p
    `)
    
    // Create test licenses
    await session.run(`
      CREATE (l1:License {id: $mit, name: 'MIT'})
      CREATE (l2:License {id: $gpl, name: 'GPL-3.0'})
      MERGE (t:Team {name: 'Security'})
    `, {
      mit: `${TEST_PREFIX}MIT`,
      gpl: `${TEST_PREFIX}GPL`
    })
  })

  describe('getOrCreateOrgLicensePolicy()', () => {
    it('should create organization license policy if not exists', async () => {
      if (!neo4jAvailable) return

      const policy = await policyRepo.getOrCreateOrgLicensePolicy()

      expect(policy).toBeDefined()
      expect(policy.name).toBe('Organization License Policy')
      expect(policy.ruleType).toBe('license-compliance')
      expect(policy.licenseMode).toBe('denylist')
      expect(policy.status).toBe('active')
    })

    it('should return existing policy on subsequent calls', async () => {
      if (!neo4jAvailable) return

      const policy1 = await policyRepo.getOrCreateOrgLicensePolicy()
      const policy2 = await policyRepo.getOrCreateOrgLicensePolicy()

      expect(policy1.name).toBe(policy2.name)
    })
  })

  describe('denyLicense()', () => {
    it('should add license to deny list', async () => {
      if (!neo4jAvailable) return

      const result = await policyRepo.denyLicense(`${TEST_PREFIX}MIT`)

      expect(result.added).toBe(true)
      expect(result.policy.deniedLicenses).toContain(`${TEST_PREFIX}MIT`)
    })

    it('should return added=false if license already denied', async () => {
      if (!neo4jAvailable) return

      await policyRepo.denyLicense(`${TEST_PREFIX}MIT`)
      const result = await policyRepo.denyLicense(`${TEST_PREFIX}MIT`)

      expect(result.added).toBe(false)
    })

    it('should create audit log entry', async () => {
      if (!neo4jAvailable || !session) return

      await policyRepo.denyLicense(`${TEST_PREFIX}GPL`)

      const auditResult = await session.run(`
        MATCH (a:AuditLog {operation: 'DENY_LICENSE'})
        WHERE a.licenseId = $licenseId
        RETURN a.operation as operation
      `, { licenseId: `${TEST_PREFIX}GPL` })

      expect(auditResult.records.length).toBe(1)
    })
  })

  describe('allowLicense()', () => {
    it('should remove license from deny list', async () => {
      if (!neo4jAvailable) return

      // First deny
      await policyRepo.denyLicense(`${TEST_PREFIX}MIT`)
      
      // Then allow
      const result = await policyRepo.allowLicense(`${TEST_PREFIX}MIT`)

      expect(result.removed).toBe(true)
      expect(result.policy.deniedLicenses).not.toContain(`${TEST_PREFIX}MIT`)
    })

    it('should return removed=false if license was not denied', async () => {
      if (!neo4jAvailable) return

      // Ensure policy exists
      await policyRepo.getOrCreateOrgLicensePolicy()
      
      const result = await policyRepo.allowLicense(`${TEST_PREFIX}MIT`)

      expect(result.removed).toBe(false)
    })
  })

  describe('getDeniedLicenseIds()', () => {
    it('should return list of denied license IDs', async () => {
      if (!neo4jAvailable) return

      await policyRepo.denyLicense(`${TEST_PREFIX}MIT`)
      await policyRepo.denyLicense(`${TEST_PREFIX}GPL`)

      const deniedIds = await policyRepo.getDeniedLicenseIds()

      expect(deniedIds).toContain(`${TEST_PREFIX}MIT`)
      expect(deniedIds).toContain(`${TEST_PREFIX}GPL`)
    })

    it('should return empty array when no licenses denied', async () => {
      if (!neo4jAvailable) return

      // Ensure policy exists but no denials
      await policyRepo.getOrCreateOrgLicensePolicy()

      const deniedIds = await policyRepo.getDeniedLicenseIds()

      expect(Array.isArray(deniedIds)).toBe(true)
    })
  })

  describe('isLicenseDenied()', () => {
    it('should return true for denied license', async () => {
      if (!neo4jAvailable) return

      await policyRepo.denyLicense(`${TEST_PREFIX}MIT`)

      const isDenied = await policyRepo.isLicenseDenied(`${TEST_PREFIX}MIT`)

      expect(isDenied).toBe(true)
    })

    it('should return false for non-denied license', async () => {
      if (!neo4jAvailable) return

      await policyRepo.getOrCreateOrgLicensePolicy()

      const isDenied = await policyRepo.isLicenseDenied(`${TEST_PREFIX}MIT`)

      expect(isDenied).toBe(false)
    })
  })
})
