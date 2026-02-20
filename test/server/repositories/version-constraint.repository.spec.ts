import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_vc_repo_'
let ctx: TestContext
let repo: VersionConstraintRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new VersionConstraintRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('VersionConstraintRepository', () => {
  describe('findAll()', () => {
    it('should return constraints', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:VersionConstraint {
          name: $name, severity: 'warning',
          status: 'active', scope: 'organization', versionRange: '>=18.0.0'
        })
      `, { name: `${PREFIX}test-vc` })

      const result = await repo.findAll()
      const test = result.filter(c => c.name.startsWith(PREFIX))

      expect(test.length).toBeGreaterThanOrEqual(1)
      expect(test[0].name).toBe(`${PREFIX}test-vc`)
    })
  })

  describe('findByName()', () => {
    it('should return null for non-existent constraint', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return constraint with details', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:VersionConstraint {
          name: $name, description: 'Test description',
          severity: 'error', status: 'active', scope: 'organization',
          versionRange: '>=1.0.0'
        })
      `, { name: `${PREFIX}detail-vc` })

      const vc = await repo.findByName(`${PREFIX}detail-vc`)

      expect(vc).not.toBeNull()
      expect(vc!.name).toBe(`${PREFIX}detail-vc`)
      expect(vc!.description).toBe('Test description')
      expect(vc!.severity).toBe('error')
    })
  })

  describe('exists()', () => {
    it('should return false for non-existent constraint', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.exists(`${PREFIX}nonexistent`)).toBe(false)
    })

    it('should return true for existing constraint', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:VersionConstraint { name: $name, severity: 'info', status: 'draft', versionRange: '>=1.0.0' })
      `, { name: `${PREFIX}exists` })

      expect(await repo.exists(`${PREFIX}exists`)).toBe(true)
    })
  })

  describe('delete()', () => {
    it('should delete a constraint and its relationships', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (vc:VersionConstraint { name: $name, severity: 'info', status: 'draft', versionRange: '>=1.0.0' })
        CREATE (t:Team { name: $team })
        CREATE (t)-[:SUBJECT_TO]->(vc)
      `, { name: `${PREFIX}to-delete`, team: `${PREFIX}team` })

      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(true)
      await repo.delete(`${PREFIX}to-delete`, 'test-user')
      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(false)
    })
  })
})
