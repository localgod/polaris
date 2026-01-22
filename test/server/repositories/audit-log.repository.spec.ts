import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { AuditLogRepository } from '../../../server/repositories/audit-log.repository'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'
const TEST_PREFIX = 'test_audit_'

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
    // Also clean up audit logs
    const session = driver.session()
    try {
      await session.run(`
        MATCH (a:AuditLog)
        WHERE a.entityId STARTS WITH $prefix OR a.userId STARTS WITH $prefix
        DETACH DELETE a
      `, { prefix: TEST_PREFIX })
    } finally {
      await session.close()
    }
    await driver.close()
  }
})

describe('AuditLogRepository', () => {
  let auditLogRepo: AuditLogRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    auditLogRepo = new AuditLogRepository(driver)
    session = driver.session()
    
    // Clean up test audit logs
    await session.run(`
      MATCH (a:AuditLog)
      WHERE a.entityId STARTS WITH $prefix OR a.userId STARTS WITH $prefix
      DETACH DELETE a
    `, { prefix: TEST_PREFIX })
    
    // Create test audit logs
    await session.run(`
      CREATE (a1:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: 'CREATE',
        entityType: 'Policy',
        entityId: $entityId1,
        entityLabel: 'Test Policy 1',
        source: 'API',
        userId: $userId
      })
      CREATE (a2:AuditLog {
        id: randomUUID(),
        timestamp: datetime() - duration('PT1H'),
        operation: 'ACTIVATE',
        entityType: 'Policy',
        entityId: $entityId2,
        entityLabel: 'Test Policy 2',
        previousStatus: 'draft',
        newStatus: 'active',
        source: 'API',
        userId: $userId
      })
      CREATE (a3:AuditLog {
        id: randomUUID(),
        timestamp: datetime() - duration('PT2H'),
        operation: 'DENY_LICENSE',
        entityType: 'Policy',
        entityId: $entityId3,
        entityLabel: 'Org License Policy',
        licenseId: 'MIT',
        source: 'API',
        userId: $userId
      })
    `, {
      entityId1: `${TEST_PREFIX}policy-1`,
      entityId2: `${TEST_PREFIX}policy-2`,
      entityId3: `${TEST_PREFIX}policy-3`,
      userId: `${TEST_PREFIX}user`
    })
  })

  describe('findAll() - Happy Paths', () => {
    it('should return audit logs ordered by timestamp descending', async () => {
      if (!neo4jAvailable) return

      const logs = await auditLogRepo.findAll({ limit: 10 })

      expect(Array.isArray(logs)).toBe(true)
      expect(logs.length).toBeGreaterThan(0)
      
      // Check ordering (most recent first)
      for (let i = 1; i < logs.length; i++) {
        const prev = new Date(logs[i - 1].timestamp)
        const curr = new Date(logs[i].timestamp)
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime())
      }
    })

    it('should filter by entityType', async () => {
      if (!neo4jAvailable) return

      const logs = await auditLogRepo.findAll({ entityType: 'Policy' })

      expect(logs.length).toBeGreaterThan(0)
      logs.forEach(log => {
        expect(log.entityType).toBe('Policy')
      })
    })

    it('should filter by operation', async () => {
      if (!neo4jAvailable) return

      const logs = await auditLogRepo.findAll({ operation: 'ACTIVATE' })

      logs.forEach(log => {
        expect(log.operation).toBe('ACTIVATE')
      })
    })

    it('should respect limit parameter', async () => {
      if (!neo4jAvailable) return

      const logs = await auditLogRepo.findAll({ limit: 2 })

      expect(logs.length).toBeLessThanOrEqual(2)
    })

    it('should respect offset parameter', async () => {
      if (!neo4jAvailable) return

      const allLogs = await auditLogRepo.findAll({ limit: 10 })
      const offsetLogs = await auditLogRepo.findAll({ limit: 10, offset: 1 })

      if (allLogs.length > 1) {
        expect(offsetLogs[0].id).toBe(allLogs[1].id)
      }
    })
  })

  describe('count() - Happy Paths', () => {
    it('should return total count of audit logs', async () => {
      if (!neo4jAvailable) return

      const count = await auditLogRepo.count()

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(3) // We created 3 test logs
    })

    it('should return filtered count', async () => {
      if (!neo4jAvailable) return

      const totalCount = await auditLogRepo.count()
      const filteredCount = await auditLogRepo.count({ operation: 'ACTIVATE' })

      expect(filteredCount).toBeLessThanOrEqual(totalCount)
    })
  })

  describe('getEntityTypes() - Happy Paths', () => {
    it('should return distinct entity types', async () => {
      if (!neo4jAvailable) return

      const entityTypes = await auditLogRepo.getEntityTypes()

      expect(Array.isArray(entityTypes)).toBe(true)
      expect(entityTypes).toContain('Policy')
    })
  })

  describe('getOperations() - Happy Paths', () => {
    it('should return distinct operations', async () => {
      if (!neo4jAvailable) return

      const operations = await auditLogRepo.getOperations()

      expect(Array.isArray(operations)).toBe(true)
      expect(operations.length).toBeGreaterThan(0)
    })
  })

  describe('findAll() - Edge Cases', () => {
    it('should return empty array when no logs match filter', async () => {
      if (!neo4jAvailable) return

      const logs = await auditLogRepo.findAll({ entityType: 'NonExistentType' })

      expect(Array.isArray(logs)).toBe(true)
      expect(logs.length).toBe(0)
    })

    it('should handle combined filters', async () => {
      if (!neo4jAvailable) return

      const logs = await auditLogRepo.findAll({
        entityType: 'Policy',
        operation: 'ACTIVATE'
      })

      logs.forEach(log => {
        expect(log.entityType).toBe('Policy')
        expect(log.operation).toBe('ACTIVATE')
      })
    })
  })
})
