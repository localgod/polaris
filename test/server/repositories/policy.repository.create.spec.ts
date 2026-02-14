import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_policy_create_'
let ctx: TestContext
let repo: PolicyRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })
afterEach(async () => { if (session) await session.close() })

describe('PolicyRepository - Create Policy', () => {
  beforeEach(async () => {
    if (!ctx.neo4jAvailable) return
    await cleanupTestData(ctx.driver, { prefix: PREFIX })
    repo = new PolicyRepository(ctx.driver)
    session = ctx.driver.session()

    await seed(ctx.driver, `
      CREATE (:Team { name: $t1 })
      CREATE (:Team { name: $t2 })
    `, { t1: `${PREFIX}Security`, t2: `${PREFIX}DevOps` })
  })

  describe('create()', () => {
    it('should create a basic compliance policy', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.create({
        name: `${PREFIX}basic-policy`, description: 'A basic test policy',
        ruleType: 'compliance', severity: 'warning', scope: 'organization', status: 'active',
        userId: 'test-user'
      })

      expect(result.policy.name).toBe(`${PREFIX}basic-policy`)
      expect(result.policy.ruleType).toBe('compliance')
      expect(result.policy.severity).toBe('warning')
      expect(result.policy.status).toBe('active')
    })

    it('should create a license-compliance policy with denylist', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:License { id: $l1, name: 'MIT' })
        CREATE (:License { id: $l2, name: 'GPL-3.0' })
      `, { l1: `${PREFIX}MIT`, l2: `${PREFIX}GPL-3.0` })

      const result = await repo.create({
        name: `${PREFIX}deny-gpl`, description: 'Deny GPL licenses',
        ruleType: 'license-compliance', severity: 'error', scope: 'organization',
        licenseMode: 'denylist', deniedLicenses: [`${PREFIX}GPL-3.0`],
        userId: 'test-user'
      })

      expect(result.policy.ruleType).toBe('license-compliance')
      expect(result.policy.licenseMode).toBe('denylist')
      expect(result.policy.deniedLicenses).toContain(`${PREFIX}GPL-3.0`)
      expect(result.relationshipsCreated).toBeGreaterThan(0)
    })

    it('should create a license-compliance policy with allowlist', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:License { id: $l, name: 'MIT' })`, { l: `${PREFIX}MIT-allow` })

      const result = await repo.create({
        name: `${PREFIX}allow-mit`, description: 'Only allow MIT',
        ruleType: 'license-compliance', severity: 'error', scope: 'organization',
        licenseMode: 'allowlist', allowedLicenses: [`${PREFIX}MIT-allow`],
        userId: 'test-user'
      })

      expect(result.policy.licenseMode).toBe('allowlist')
      expect(result.policy.allowedLicenses).toContain(`${PREFIX}MIT-allow`)
    })

    it('should create policy with draft status', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.create({
        name: `${PREFIX}draft-policy`, ruleType: 'compliance', severity: 'info', status: 'draft',
        userId: 'test-user'
      })

      expect(result.policy.status).toBe('draft')
    })

    it('should create SUBJECT_TO relationships for organization scope', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.create({
        name: `${PREFIX}org-policy`, ruleType: 'compliance', severity: 'warning', scope: 'organization',
        userId: 'test-user'
      })

      const result = await session.run(`
        MATCH (t:Team)-[:SUBJECT_TO]->(p:Policy { name: $name })
        RETURN count(t) as count
      `, { name: `${PREFIX}org-policy` })

      expect(result.records[0]?.get('count').toNumber()).toBeGreaterThan(0)
    })
  })
})

describe('PolicyRepository - Update Status', () => {
  beforeEach(async () => {
    if (!ctx.neo4jAvailable) return
    await cleanupTestData(ctx.driver, { prefix: PREFIX })
    repo = new PolicyRepository(ctx.driver)
    session = ctx.driver.session()

    await seed(ctx.driver, `
      CREATE (:Policy {
        name: $name, ruleType: 'compliance', severity: 'warning',
        status: 'active', scope: 'organization'
      })
    `, { name: `${PREFIX}status-test` })
  })

  describe('updateStatus()', () => {
    it('should update status from active to draft', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.updateStatus(`${PREFIX}status-test`, { status: 'draft', reason: 'Testing' })

      expect(result.previousStatus).toBe('active')
      expect(result.policy.status).toBe('draft')
    })

    it('should update status from draft to active', async () => {
      if (!ctx.neo4jAvailable) return
      await session.run(`MATCH (p:Policy { name: $n }) SET p.status = 'draft'`, { n: `${PREFIX}status-test` })

      const result = await repo.updateStatus(`${PREFIX}status-test`, { status: 'active' })

      expect(result.previousStatus).toBe('draft')
      expect(result.policy.status).toBe('active')
    })

    it('should create audit log entry on status change', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.updateStatus(`${PREFIX}status-test`, { status: 'archived', reason: 'No longer needed' })

      const result = await session.run(`
        MATCH (a:AuditLog)-[:AUDITS]->(p:Policy { name: $name })
        RETURN a.operation as operation, a.reason as reason
        ORDER BY a.timestamp DESC LIMIT 1
      `, { name: `${PREFIX}status-test` })

      expect(result.records.length).toBe(1)
      expect(result.records[0].get('operation')).toBe('ARCHIVE')
      expect(result.records[0].get('reason')).toBe('No longer needed')
    })

    it('should throw for non-existent policy', async () => {
      if (!ctx.neo4jAvailable) return
      await expect(
        repo.updateStatus(`${PREFIX}nonexistent`, { status: 'draft' })
      ).rejects.toThrow()
    })
  })
})

describe('PolicyRepository - Organization License Policy', () => {
  beforeEach(async () => {
    if (!ctx.neo4jAvailable) return
    await cleanupTestData(ctx.driver, { prefix: PREFIX })
    repo = new PolicyRepository(ctx.driver)
    session = ctx.driver.session()

    // Clean up org license policy and create test data
    await session.run(`MATCH (p:Policy { name: 'Organization License Policy' }) DETACH DELETE p`)
    await seed(ctx.driver, `
      CREATE (:License { id: $mit, name: 'MIT' })
      CREATE (:License { id: $gpl, name: 'GPL-3.0' })
      MERGE (:Team { name: 'Security' })
    `, { mit: `${PREFIX}MIT`, gpl: `${PREFIX}GPL` })
  })

  describe('getOrCreateOrgLicensePolicy()', () => {
    it('should create organization license policy if not exists', async () => {
      if (!ctx.neo4jAvailable) return
      const policy = await repo.getOrCreateOrgLicensePolicy()

      expect(policy.name).toBe('Organization License Policy')
      expect(policy.ruleType).toBe('license-compliance')
      expect(policy.licenseMode).toBe('denylist')
      expect(policy.status).toBe('active')
    })

    it('should return existing policy on subsequent calls', async () => {
      if (!ctx.neo4jAvailable) return
      const p1 = await repo.getOrCreateOrgLicensePolicy()
      const p2 = await repo.getOrCreateOrgLicensePolicy()

      expect(p1.name).toBe(p2.name)
    })
  })

  describe('denyLicense()', () => {
    it('should add license to deny list', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.denyLicense(`${PREFIX}MIT`)

      expect(result.added).toBe(true)
      expect(result.policy.deniedLicenses).toContain(`${PREFIX}MIT`)
    })

    it('should return added=false if already denied', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.denyLicense(`${PREFIX}MIT`)
      const result = await repo.denyLicense(`${PREFIX}MIT`)

      expect(result.added).toBe(false)
    })

    it('should create audit log entry', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.denyLicense(`${PREFIX}GPL`)

      const result = await session.run(`
        MATCH (a:AuditLog { operation: 'DENY_LICENSE' })
        WHERE a.licenseId = $id
        RETURN a.operation as operation
      `, { id: `${PREFIX}GPL` })

      expect(result.records.length).toBe(1)
    })
  })

  describe('allowLicense()', () => {
    it('should remove license from deny list', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.denyLicense(`${PREFIX}MIT`)
      const result = await repo.allowLicense(`${PREFIX}MIT`)

      expect(result.removed).toBe(true)
      expect(result.policy.deniedLicenses).not.toContain(`${PREFIX}MIT`)
    })

    it('should return removed=false if not denied', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.getOrCreateOrgLicensePolicy()
      const result = await repo.allowLicense(`${PREFIX}MIT`)

      expect(result.removed).toBe(false)
    })
  })

  describe('getDeniedLicenseIds()', () => {
    it('should return denied license IDs', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.denyLicense(`${PREFIX}MIT`)
      await repo.denyLicense(`${PREFIX}GPL`)

      const ids = await repo.getDeniedLicenseIds()

      expect(ids).toContain(`${PREFIX}MIT`)
      expect(ids).toContain(`${PREFIX}GPL`)
    })

    it('should return empty array when none denied', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.getOrCreateOrgLicensePolicy()

      const ids = await repo.getDeniedLicenseIds()

      expect(Array.isArray(ids)).toBe(true)
    })
  })

  describe('isLicenseDenied()', () => {
    it('should return true for denied license', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.denyLicense(`${PREFIX}MIT`)

      expect(await repo.isLicenseDenied(`${PREFIX}MIT`)).toBe(true)
    })

    it('should return false for non-denied license', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.getOrCreateOrgLicensePolicy()

      expect(await repo.isLicenseDenied(`${PREFIX}MIT`)).toBe(false)
    })
  })
})
