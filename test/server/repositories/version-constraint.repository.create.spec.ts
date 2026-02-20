import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_vc_create_'
let ctx: TestContext
let repo: VersionConstraintRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })
afterEach(async () => { if (session) await session.close() })

describe('VersionConstraintRepository - Create', () => {
  beforeEach(async () => {
    if (!ctx.neo4jAvailable) return
    await cleanupTestData(ctx.driver, { prefix: PREFIX })
    repo = new VersionConstraintRepository(ctx.driver)
    session = ctx.driver.session()

    await seed(ctx.driver, `
      CREATE (:Team { name: $t1 })
      CREATE (:Team { name: $t2 })
    `, { t1: `${PREFIX}Security`, t2: `${PREFIX}DevOps` })
  })

  describe('create()', () => {
    it('should create a basic version constraint', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.create({
        name: `${PREFIX}basic-vc`, description: 'A basic test constraint',
        severity: 'warning', scope: 'organization', status: 'active',
        versionRange: '>=18.0.0',
        userId: 'test-user'
      })

      expect(result.constraint.name).toBe(`${PREFIX}basic-vc`)
      expect(result.constraint.severity).toBe('warning')
      expect(result.constraint.status).toBe('active')
    })

    it('should create constraint with draft status', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.create({
        name: `${PREFIX}draft-vc`, severity: 'info', status: 'draft',
        versionRange: '>=1.0.0',
        userId: 'test-user'
      })

      expect(result.constraint.status).toBe('draft')
    })

    it('should create SUBJECT_TO relationships for organization scope', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.create({
        name: `${PREFIX}org-vc`, severity: 'warning', scope: 'organization',
        versionRange: '>=1.0.0',
        userId: 'test-user'
      })

      const result = await session.run(`
        MATCH (t:Team)-[:SUBJECT_TO]->(vc:VersionConstraint { name: $name })
        RETURN count(t) as count
      `, { name: `${PREFIX}org-vc` })

      expect(result.records[0]?.get('count').toNumber()).toBeGreaterThan(0)
    })
  })
})

describe('VersionConstraintRepository - Update Status', () => {
  beforeEach(async () => {
    if (!ctx.neo4jAvailable) return
    await cleanupTestData(ctx.driver, { prefix: PREFIX })
    repo = new VersionConstraintRepository(ctx.driver)
    session = ctx.driver.session()

    await seed(ctx.driver, `
      CREATE (:VersionConstraint {
        name: $name, severity: 'warning',
        status: 'active', scope: 'organization', versionRange: '>=1.0.0'
      })
    `, { name: `${PREFIX}status-test` })
  })

  describe('updateStatus()', () => {
    it('should update status from active to draft', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.updateStatus(`${PREFIX}status-test`, { status: 'draft', reason: 'Testing' })

      expect(result.previousStatus).toBe('active')
      expect(result.constraint.status).toBe('draft')
    })

    it('should update status from draft to active', async () => {
      if (!ctx.neo4jAvailable) return
      await session.run(`MATCH (vc:VersionConstraint { name: $n }) SET vc.status = 'draft'`, { n: `${PREFIX}status-test` })

      const result = await repo.updateStatus(`${PREFIX}status-test`, { status: 'active' })

      expect(result.previousStatus).toBe('draft')
      expect(result.constraint.status).toBe('active')
    })

    it('should create audit log entry on status change', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.updateStatus(`${PREFIX}status-test`, { status: 'archived', reason: 'No longer needed' })

      const result = await session.run(`
        MATCH (a:AuditLog)-[:AUDITS]->(vc:VersionConstraint { name: $name })
        RETURN a.operation as operation, a.reason as reason
        ORDER BY a.timestamp DESC LIMIT 1
      `, { name: `${PREFIX}status-test` })

      expect(result.records.length).toBe(1)
      expect(result.records[0].get('operation')).toBe('ARCHIVE')
      expect(result.records[0].get('reason')).toBe('No longer needed')
    })

    it('should throw for non-existent constraint', async () => {
      if (!ctx.neo4jAvailable) return
      await expect(
        repo.updateStatus(`${PREFIX}nonexistent`, { status: 'draft' })
      ).rejects.toThrow()
    })
  })
})
