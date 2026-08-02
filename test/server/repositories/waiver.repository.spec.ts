import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { WaiverRepository } from '../../../server/repositories/waiver.repository'
import { getTestContext, cleanupTestData, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_waiver_repo_'
let ctx: TestContext
let repo: WaiverRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new WaiverRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('WaiverRepository', () => {
  describe('[contract] findOwningTeamForSystem()', () => {
    it('resolves the team that owns a system', async () => {
      if (!ctx.neo4jAvailable) return
      await session.run(`
        CREATE (t:Team {name: $team})
        CREATE (s:System {name: $sys})
        CREATE (t)-[:OWNS]->(s)
      `, { team: `${PREFIX}team`, sys: `${PREFIX}system` })

      const result = await repo.findOwningTeamForSystem(`${PREFIX}system`)
      expect(result).toBe(`${PREFIX}team`)
    })

    it('returns null when the system has no owning team', async () => {
      if (!ctx.neo4jAvailable) return
      await session.run('CREATE (s:System {name: $sys})', { sys: `${PREFIX}unowned-system` })

      const result = await repo.findOwningTeamForSystem(`${PREFIX}unowned-system`)
      expect(result).toBeNull()
    })
  })

  describe('[contract] create()', () => {
    it('MERGE-creates the LicenseViolation node if absent, then attaches a Waiver', async () => {
      if (!ctx.neo4jAvailable) return

      const naturalKey = {
        systemName: `${PREFIX}system`,
        componentPurl: `pkg:npm/${PREFIX}comp@1.0.0`,
        licenseId: `${PREFIX}license`
      }

      const waiver = await repo.create('license', naturalKey, {
        reason: 'accepted for now',
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdBy: `${PREFIX}user`
      })

      expect(waiver.reason).toBe('accepted for now')
      expect(waiver.createdBy).toBe(`${PREFIX}user`)

      const record = await session.run(`
        MATCH (lv:LicenseViolation {naturalKey: $key})<-[:WAIVES]-(w:Waiver {id: $id})
        RETURN lv.status as status
      `, { key: `${naturalKey.systemName}|${naturalKey.componentPurl}|${naturalKey.licenseId}`, id: waiver.id })

      expect(record.records.length).toBe(1)
      expect(record.records[0]!.get('status')).toBe('open')
    })

    it('creates a ComplianceViolation waiver keyed by team+technology', async () => {
      if (!ctx.neo4jAvailable) return

      const waiver = await repo.create('compliance', { teamName: `${PREFIX}team`, technologyName: `${PREFIX}tech` }, {
        reason: 'known gap, tracked externally',
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdBy: `${PREFIX}user`
      })

      const record = await session.run(`
        MATCH (cv:ComplianceViolation {naturalKey: $key})<-[:WAIVES]-(w:Waiver {id: $id})
        RETURN cv
      `, { key: `${PREFIX}team|${PREFIX}tech`, id: waiver.id })

      expect(record.records.length).toBe(1)
    })
  })

  describe('[contract] findForRevoke() / revoke()', () => {
    it('resolves the owning team via System-OWNS for a license waiver', async () => {
      if (!ctx.neo4jAvailable) return
      await session.run(`
        CREATE (t:Team {name: $team})
        CREATE (s:System {name: $sys})
        CREATE (t)-[:OWNS]->(s)
      `, { team: `${PREFIX}team`, sys: `${PREFIX}system` })

      const waiver = await repo.create('license', {
        systemName: `${PREFIX}system`,
        componentPurl: `pkg:npm/${PREFIX}comp@1.0.0`,
        licenseId: `${PREFIX}license`
      }, { reason: 'r', expiresAt: '2099-01-01T00:00:00.000Z', createdBy: `${PREFIX}user` })

      const forRevoke = await repo.findForRevoke(waiver.id)
      expect(forRevoke?.teamName).toBe(`${PREFIX}team`)
      expect(forRevoke?.violationType).toBe('LicenseViolation')
      expect(forRevoke?.revokedAt).toBeNull()
    })

    it('resolves the owning team directly for a compliance waiver', async () => {
      if (!ctx.neo4jAvailable) return
      const waiver = await repo.create('compliance', { teamName: `${PREFIX}team2`, technologyName: `${PREFIX}tech2` }, {
        reason: 'r', expiresAt: '2099-01-01T00:00:00.000Z', createdBy: `${PREFIX}user`
      })

      const forRevoke = await repo.findForRevoke(waiver.id)
      expect(forRevoke?.teamName).toBe(`${PREFIX}team2`)
      expect(forRevoke?.violationType).toBe('ComplianceViolation')
    })

    it('revokes a waiver, setting revokedAt/revokedBy, and reports it on subsequent lookups', async () => {
      if (!ctx.neo4jAvailable) return
      const waiver = await repo.create('compliance', { teamName: `${PREFIX}team3`, technologyName: `${PREFIX}tech3` }, {
        reason: 'r', expiresAt: '2099-01-01T00:00:00.000Z', createdBy: `${PREFIX}user`
      })

      const revoked = await repo.revoke(waiver.id, `${PREFIX}revoker`)
      expect(revoked).toBe(true)

      const forRevoke = await repo.findForRevoke(waiver.id)
      expect(forRevoke?.revokedAt).not.toBeNull()
    })

    it('returns false when revoking a non-existent waiver', async () => {
      if (!ctx.neo4jAvailable) return
      const revoked = await repo.revoke(`${PREFIX}nonexistent`, `${PREFIX}revoker`)
      expect(revoked).toBe(false)
    })
  })
})
