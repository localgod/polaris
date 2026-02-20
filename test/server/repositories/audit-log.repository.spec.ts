import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { AuditLogRepository } from '../../../server/repositories/audit-log.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_audit_'
let ctx: TestContext
let repo: AuditLogRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new AuditLogRepository(ctx.driver)
  session = ctx.driver.session()

  await seed(ctx.driver, `
    CREATE (:AuditLog {
      id: randomUUID(), timestamp: datetime(), operation: 'CREATE',
      entityType: 'VersionConstraint', entityId: $e1, entityLabel: 'Test VC 1',
      source: 'API', userId: $user
    })
    CREATE (:AuditLog {
      id: randomUUID(), timestamp: datetime() - duration('PT1H'), operation: 'ACTIVATE',
      entityType: 'VersionConstraint', entityId: $e2, entityLabel: 'Test VC 2',
      previousStatus: 'draft', newStatus: 'active', source: 'API', userId: $user
    })
    CREATE (:AuditLog {
      id: randomUUID(), timestamp: datetime() - duration('PT2H'), operation: 'DENY_LICENSE',
      entityType: 'VersionConstraint', entityId: $e3, entityLabel: 'Org License VC',
      licenseId: 'MIT', source: 'API', userId: $user
    })
  `, {
    e1: `${PREFIX}policy-1`, e2: `${PREFIX}policy-2`, e3: `${PREFIX}policy-3`,
    user: `${PREFIX}user`
  })
})

afterEach(async () => { if (session) await session.close() })

describe('AuditLogRepository', () => {
  describe('findAll()', () => {
    it('should return logs ordered by timestamp descending', async () => {
      if (!ctx.neo4jAvailable) return
      const logs = await repo.findAll({ limit: 10 })

      expect(logs.length).toBeGreaterThan(0)
      for (let i = 1; i < logs.length; i++) {
        expect(new Date(logs[i - 1].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(logs[i].timestamp).getTime())
      }
    })

    it('should filter by entityType', async () => {
      if (!ctx.neo4jAvailable) return
      const logs = await repo.findAll({ entityType: 'VersionConstraint' })

      expect(logs.length).toBeGreaterThan(0)
      logs.forEach(log => expect(log.entityType).toBe('VersionConstraint'))
    })

    it('should filter by operation', async () => {
      if (!ctx.neo4jAvailable) return
      const logs = await repo.findAll({ operation: 'ACTIVATE' })

      logs.forEach(log => expect(log.operation).toBe('ACTIVATE'))
    })

    it('should respect limit', async () => {
      if (!ctx.neo4jAvailable) return
      const logs = await repo.findAll({ limit: 2 })

      expect(logs.length).toBeLessThanOrEqual(2)
    })

    it('should respect offset', async () => {
      if (!ctx.neo4jAvailable) return
      const all = await repo.findAll({ limit: 10 })
      const offset = await repo.findAll({ limit: 10, offset: 1 })

      if (all.length > 1) expect(offset[0].id).toBe(all[1].id)
    })

    it('should return empty array for non-existent entityType', async () => {
      if (!ctx.neo4jAvailable) return
      const logs = await repo.findAll({ entityType: 'NonExistent' })

      expect(logs).toEqual([])
    })

    it('should handle combined filters', async () => {
      if (!ctx.neo4jAvailable) return
      const logs = await repo.findAll({ entityType: 'VersionConstraint', operation: 'ACTIVATE' })

      logs.forEach(log => {
        expect(log.entityType).toBe('VersionConstraint')
        expect(log.operation).toBe('ACTIVATE')
      })
    })

    it('should resolve userName when matching User node exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:User { id: $userId, email: $email, name: $name, role: 'superuser', provider: 'github', createdAt: datetime() })
        CREATE (:AuditLog {
          id: randomUUID(), timestamp: datetime(), operation: 'ADD_TEAM_MEMBER',
          entityType: 'User', entityId: $entityId, entityLabel: 'Target User',
          source: 'API', userId: $userId
        })
      `, {
        userId: `${PREFIX}performer`, email: `${PREFIX}performer@test.com`,
        name: `${PREFIX}Admin Name`, entityId: `${PREFIX}target`
      })

      const logs = await repo.findAll({ operation: 'ADD_TEAM_MEMBER' })
      const log = logs.find(l => l.entityId === `${PREFIX}target`)

      expect(log).toBeDefined()
      expect(log!.userName).toBe(`${PREFIX}Admin Name`)
    })

    it('should return null userName when no matching User node exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:AuditLog {
          id: randomUUID(), timestamp: datetime(), operation: 'REMOVE_TEAM_MEMBER',
          entityType: 'User', entityId: $entityId, entityLabel: 'Orphan Target',
          source: 'API', userId: $userId
        })
      `, { userId: `${PREFIX}ghost`, entityId: `${PREFIX}orphan-target` })

      const logs = await repo.findAll({ operation: 'REMOVE_TEAM_MEMBER' })
      const log = logs.find(l => l.entityId === `${PREFIX}orphan-target`)

      expect(log).toBeDefined()
      expect(log!.userName).toBeNull()
    })
  })

  describe('count()', () => {
    it('should return total count', async () => {
      if (!ctx.neo4jAvailable) return
      const count = await repo.count()

      expect(count).toBeGreaterThanOrEqual(3)
    })

    it('should return filtered count', async () => {
      if (!ctx.neo4jAvailable) return
      const total = await repo.count()
      const filtered = await repo.count({ operation: 'ACTIVATE' })

      expect(filtered).toBeLessThanOrEqual(total)
    })
  })

  describe('getEntityTypes()', () => {
    it('should return distinct entity types', async () => {
      if (!ctx.neo4jAvailable) return
      const types = await repo.getEntityTypes()

      expect(types).toContain('VersionConstraint')
    })
  })

  describe('getOperations()', () => {
    it('should return distinct operations', async () => {
      if (!ctx.neo4jAvailable) return
      const ops = await repo.getOperations()

      expect(ops.length).toBeGreaterThan(0)
    })
  })
})
