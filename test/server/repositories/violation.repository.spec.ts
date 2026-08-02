import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { ViolationRepository } from '../../../server/repositories/violation.repository'
import { getTestContext, cleanupTestData, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_violation_repo_'
let ctx: TestContext
let repo: ViolationRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new ViolationRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('ViolationRepository', () => {
  describe('[contract] reconcileLicenseViolations()', () => {
    it('creates an open node on first sight, keeps it open on re-sight, resolves when absent, reopens on reappearance', async () => {
      if (!ctx.neo4jAvailable) return

      const key = {
        systemName: `${PREFIX}system`,
        componentPurl: `pkg:npm/${PREFIX}comp@1.0.0`,
        licenseId: `${PREFIX}license`
      }
      const naturalKey = `${key.systemName}|${key.componentPurl}|${key.licenseId}`

      // First run: creates an open node
      const first = await repo.reconcileLicenseViolations([key], '2026-01-01T00:00:00.000Z')
      expect(first).toEqual({ touched: 1, resolved: 0 })

      let record = await session.run('MATCH (lv:LicenseViolation {naturalKey: $naturalKey}) RETURN lv', { naturalKey })
      expect(record.records[0]!.get('lv').properties.status).toBe('open')
      expect(record.records[0]!.get('lv').properties.firstDetectedAt.toString()).toContain('2026-01-01')

      // Second run: still present, stays open, firstDetectedAt unchanged
      await repo.reconcileLicenseViolations([key], '2026-01-02T00:00:00.000Z')
      record = await session.run('MATCH (lv:LicenseViolation {naturalKey: $naturalKey}) RETURN lv', { naturalKey })
      expect(record.records[0]!.get('lv').properties.status).toBe('open')
      expect(record.records[0]!.get('lv').properties.firstDetectedAt.toString()).toContain('2026-01-01')

      // Third run: violation no longer present, resolves
      const third = await repo.reconcileLicenseViolations([], '2026-01-03T00:00:00.000Z')
      expect(third.resolved).toBeGreaterThanOrEqual(1)
      record = await session.run('MATCH (lv:LicenseViolation {naturalKey: $naturalKey}) RETURN lv', { naturalKey })
      expect(record.records[0]!.get('lv').properties.status).toBe('resolved')
      expect(record.records[0]!.get('lv').properties.resolvedAt).not.toBeNull()

      // Fourth run: reappears, reopens under the same node (firstDetectedAt preserved), resolvedAt cleared
      await repo.reconcileLicenseViolations([key], '2026-01-04T00:00:00.000Z')
      record = await session.run('MATCH (lv:LicenseViolation {naturalKey: $naturalKey}) RETURN lv', { naturalKey })
      expect(record.records[0]!.get('lv').properties.status).toBe('open')
      // Neo4j removes a property entirely when it's SET to null, rather than
      // storing a literal null — an unresolved violation has no resolvedAt
      // key at all.
      expect(record.records[0]!.get('lv').properties.resolvedAt).toBeUndefined()
      expect(record.records[0]!.get('lv').properties.firstDetectedAt.toString()).toContain('2026-01-01')
    })
  })

  describe('[contract] reconcileComplianceViolations()', () => {
    it('creates and resolves a ComplianceViolation node', async () => {
      if (!ctx.neo4jAvailable) return

      const key = { teamName: `${PREFIX}team`, technologyName: `${PREFIX}tech` }
      const naturalKey = `${key.teamName}|${key.technologyName}`

      await repo.reconcileComplianceViolations([key], '2026-01-01T00:00:00.000Z')
      let record = await session.run('MATCH (cv:ComplianceViolation {naturalKey: $naturalKey}) RETURN cv', { naturalKey })
      expect(record.records[0]!.get('cv').properties.status).toBe('open')

      await repo.reconcileComplianceViolations([], '2026-01-02T00:00:00.000Z')
      record = await session.run('MATCH (cv:ComplianceViolation {naturalKey: $naturalKey}) RETURN cv', { naturalKey })
      expect(record.records[0]!.get('cv').properties.status).toBe('resolved')
    })
  })

  describe('[contract] reconcileVersionConstraintViolations()', () => {
    it('creates and resolves a VersionConstraintViolation node', async () => {
      if (!ctx.neo4jAvailable) return

      const key = {
        systemName: `${PREFIX}system`,
        componentPurl: `pkg:npm/${PREFIX}comp@1.0.0`,
        constraintName: `${PREFIX}constraint`
      }
      const naturalKey = `${key.systemName}|${key.componentPurl}|${key.constraintName}`

      await repo.reconcileVersionConstraintViolations([key], '2026-01-01T00:00:00.000Z')
      let record = await session.run('MATCH (vcv:VersionConstraintViolation {naturalKey: $naturalKey}) RETURN vcv', { naturalKey })
      expect(record.records[0]!.get('vcv').properties.status).toBe('open')

      await repo.reconcileVersionConstraintViolations([], '2026-01-02T00:00:00.000Z')
      record = await session.run('MATCH (vcv:VersionConstraintViolation {naturalKey: $naturalKey}) RETURN vcv', { naturalKey })
      expect(record.records[0]!.get('vcv').properties.status).toBe('resolved')
    })
  })

  describe('[contract] findActiveWaivedVersionConstraintKeys()', () => {
    it('returns only naturalKeys with an active (unrevoked, unexpired) waiver', async () => {
      if (!ctx.neo4jAvailable) return

      const activeKey = `${PREFIX}sys|${PREFIX}purl-active|${PREFIX}constraint`
      const expiredKey = `${PREFIX}sys|${PREFIX}purl-expired|${PREFIX}constraint`
      const revokedKey = `${PREFIX}sys|${PREFIX}purl-revoked|${PREFIX}constraint`
      const noWaiverKey = `${PREFIX}sys|${PREFIX}purl-none|${PREFIX}constraint`

      await session.run(`
        CREATE (v1:VersionConstraintViolation {naturalKey: $activeKey, status: 'open'})
        CREATE (w1:Waiver {id: $id1, reason: 'r', createdBy: 'u', createdAt: datetime(), expiresAt: datetime() + duration('P30D'), revokedAt: null, revokedBy: null})
        CREATE (w1)-[:WAIVES]->(v1)
        CREATE (v2:VersionConstraintViolation {naturalKey: $expiredKey, status: 'open'})
        CREATE (w2:Waiver {id: $id2, reason: 'r', createdBy: 'u', createdAt: datetime(), expiresAt: datetime() - duration('P1D'), revokedAt: null, revokedBy: null})
        CREATE (w2)-[:WAIVES]->(v2)
        CREATE (v3:VersionConstraintViolation {naturalKey: $revokedKey, status: 'open'})
        CREATE (w3:Waiver {id: $id3, reason: 'r', createdBy: 'u', createdAt: datetime(), expiresAt: datetime() + duration('P30D'), revokedAt: datetime(), revokedBy: 'u'})
        CREATE (w3)-[:WAIVES]->(v3)
        CREATE (v4:VersionConstraintViolation {naturalKey: $noWaiverKey, status: 'open'})
      `, { activeKey, expiredKey, revokedKey, noWaiverKey, id1: `${PREFIX}w1`, id2: `${PREFIX}w2`, id3: `${PREFIX}w3` })

      const result = await repo.findActiveWaivedVersionConstraintKeys([activeKey, expiredKey, revokedKey, noWaiverKey])

      expect(result.has(activeKey)).toBe(true)
      expect(result.has(expiredKey)).toBe(false)
      expect(result.has(revokedKey)).toBe(false)
      expect(result.has(noWaiverKey)).toBe(false)
    })

    it('returns an empty map without querying when given no keys', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.findActiveWaivedVersionConstraintKeys([])
      expect(result.size).toBe(0)
    })
  })
})
