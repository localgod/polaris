import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_policy_repo_'
let ctx: TestContext
let repo: PolicyRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new PolicyRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('PolicyRepository', () => {
  describe('findAll()', () => {
    it('should return policies', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Policy {
          name: $name, ruleType: 'compliance', severity: 'warning',
          status: 'active', scope: 'organization'
        })
      `, { name: `${PREFIX}test-policy` })

      const result = await repo.findAll()
      const test = result.filter(p => p.name.startsWith(PREFIX))

      expect(test.length).toBeGreaterThanOrEqual(1)
      expect(test[0].name).toBe(`${PREFIX}test-policy`)
      expect(test[0].ruleType).toBe('compliance')
    })
  })

  describe('findByName()', () => {
    it('should return null for non-existent policy', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return policy with details', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Policy {
          name: $name, description: 'Test description',
          ruleType: 'license-compliance', severity: 'error',
          status: 'active', scope: 'organization', licenseMode: 'denylist'
        })
      `, { name: `${PREFIX}detail-policy` })

      const policy = await repo.findByName(`${PREFIX}detail-policy`)

      expect(policy).not.toBeNull()
      expect(policy!.name).toBe(`${PREFIX}detail-policy`)
      expect(policy!.description).toBe('Test description')
      expect(policy!.ruleType).toBe('license-compliance')
    })
  })

  describe('exists()', () => {
    it('should return false for non-existent policy', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.exists(`${PREFIX}nonexistent`)).toBe(false)
    })

    it('should return true for existing policy', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Policy { name: $name, ruleType: 'compliance', severity: 'info', status: 'draft' })
      `, { name: `${PREFIX}exists` })

      expect(await repo.exists(`${PREFIX}exists`)).toBe(true)
    })
  })

  describe('delete()', () => {
    it('should delete a policy and its relationships', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (p:Policy { name: $name, ruleType: 'compliance', severity: 'info', status: 'draft' })
        CREATE (t:Team { name: $team })
        CREATE (t)-[:SUBJECT_TO]->(p)
      `, { name: `${PREFIX}to-delete`, team: `${PREFIX}team` })

      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(true)
      await repo.delete(`${PREFIX}to-delete`)
      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(false)
    })
  })
})
