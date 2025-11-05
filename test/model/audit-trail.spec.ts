import { expect, beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import type { Driver } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { Feature } from '../helpers/gherkin'
import { readFileSync } from 'fs'
import { join } from 'path'

Feature('Audit Trail Schema @model @unit', ({ Scenario }) => {
  let driver: Driver
  let auditLogId: string
  let auditLog: any
  let auditLogs: any[]
  let user: any

  beforeAll(async () => {
    const uri = process.env.NEO4J_TEST_URI || process.env.NEO4J_URI || 'neo4j://neo4j:7687'
    const username = process.env.NEO4J_USERNAME || 'neo4j'
    const password = process.env.NEO4J_PASSWORD || 'devpassword'

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password))

    // Apply audit trail schema migration
    const session = driver.session()
    try {
      const migrationUp = readFileSync(
        join(process.cwd(), 'schema/migrations/common/20251105_143500_add_audit_trail_schema.up.cypher'),
        'utf-8'
      )
      
      // Execute migration (skip comments and empty lines)
      const statements = migrationUp
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('//') && !s.startsWith('/*'))
      
      for (const statement of statements) {
        if (statement) {
          await session.run(statement)
        }
      }
    } finally {
      await session.close()
    }
  })

  afterAll(async () => {
    const session = driver.session()
    try {
      // Clean up test data
      await session.run('MATCH (a:AuditLog) DETACH DELETE a')
      await session.run('MATCH (u:User) WHERE u.id STARTS WITH "test-" DETACH DELETE u')
      
      // Rollback migration
      const migrationDown = readFileSync(
        join(process.cwd(), 'schema/migrations/common/20251105_143500_add_audit_trail_schema.down.cypher'),
        'utf-8'
      )
      
      const statements = migrationDown
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('//') && !s.startsWith('/*'))
      
      for (const statement of statements) {
        if (statement) {
          try {
            await session.run(statement)
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      }
    } finally {
      await session.close()
    }

    await driver.close()
  })

  beforeEach(async () => {
    const session = driver.session()
    try {
      // Clean up test data before each test
      await session.run('MATCH (a:AuditLog) DETACH DELETE a')
      await session.run('MATCH (u:User) WHERE u.id STARTS WITH "test-" DETACH DELETE u')
    } finally {
      await session.close()
    }
  })

  Scenario('Creating an audit log entry', ({ Given, When, Then }) => {
    Given('a clean Neo4j database', () => {
      // Already cleaned in beforeEach
    })

    Given('the audit trail schema is applied', () => {
      // Already applied in beforeAll
    })

    When('I create an audit log with:', async (table) => {
      const data = table.reduce((acc: any, row: any) => {
        acc[row.field] = row.value
        return acc
      }, {})

      const session = driver.session()
      try {
        auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const result = await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: $operation,
            entityType: $entityType,
            entityId: $entityId,
            userId: $userId,
            source: $source
          })
          RETURN a
        `, {
          id: auditLogId,
          ...data
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should be created successfully', () => {
      expect(auditLog).toBeDefined()
    })

    Then('the audit log should have a unique ID', () => {
      expect(auditLog.id).toBe(auditLogId)
    })

    Then('the audit log should have a timestamp', () => {
      expect(auditLog.timestamp).toBeDefined()
    })
  })

  Scenario('Tracking field changes', ({ When, Then }) => {
    When('I create an audit log with field changes:', async (table) => {
      const changes: Record<string, { before: string; after: string }> = {}
      table.forEach((row: any) => {
        changes[row.field] = { before: row.before, after: row.after }
      })

      const session = driver.session()
      try {
        auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const result = await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: 'UPDATE',
            entityType: 'Technology',
            entityId: 'React',
            userId: 'user123',
            source: 'UI',
            changes: $changes,
            changedFields: $changedFields
          })
          RETURN a
        `, {
          id: auditLogId,
          changes,
          changedFields: Object.keys(changes)
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should contain the field changes', () => {
      expect(auditLog.changes).toBeDefined()
      expect(auditLog.changes.status).toEqual({ before: 'draft', after: 'active' })
    })

    Then('the changedFields list should contain "status" and "ownerTeam"', () => {
      expect(auditLog.changedFields).toContain('status')
      expect(auditLog.changedFields).toContain('ownerTeam')
    })
  })

  Scenario('Linking audit log to user', ({ Given, When, Then }) => {
    Given('a user "user123" exists', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          CREATE (u:User {
            id: 'test-user123',
            email: 'user123@example.com',
            name: 'Test User',
            provider: 'test',
            role: 'user',
            createdAt: datetime(),
            lastLogin: datetime()
          })
          RETURN u
        `)
        user = result.records[0].get('u').properties
      } finally {
        await session.close()
      }
    })

    When('I create an audit log performed by "user123"', async () => {
      const session = driver.session()
      try {
        auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const result = await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: 'CREATE',
            entityType: 'Technology',
            entityId: 'React',
            userId: 'test-user123',
            source: 'UI'
          })
          WITH a
          MATCH (u:User {id: 'test-user123'})
          CREATE (a)-[:PERFORMED_BY]->(u)
          RETURN a
        `, { id: auditLogId })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should be linked to the user via PERFORMED_BY relationship', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog {id: $id})-[:PERFORMED_BY]->(u:User)
          RETURN u
        `, { id: auditLogId })

        expect(result.records.length).toBe(1)
        const linkedUser = result.records[0].get('u').properties
        expect(linkedUser.id).toBe('test-user123')
      } finally {
        await session.close()
      }
    })

    Then('I can query all audit logs by that user', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog {userId: 'test-user123'})
          RETURN a
        `)

        expect(result.records.length).toBeGreaterThan(0)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Querying audit logs by entity', ({ Given, When, Then }) => {
    Given('multiple audit logs exist for "React" technology', async () => {
      const session = driver.session()
      try {
        for (let i = 0; i < 3; i++) {
          await session.run(`
            CREATE (a:AuditLog {
              id: $id,
              timestamp: datetime(),
              operation: $operation,
              entityType: 'Technology',
              entityId: 'React',
              userId: 'user123',
              source: 'UI'
            })
          `, {
            id: `audit-react-${i}`,
            operation: i === 0 ? 'CREATE' : 'UPDATE'
          })
        }
      } finally {
        await session.close()
      }
    })

    When('I query audit logs for entity type "Technology" and ID "React"', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog)
          WHERE a.entityType = 'Technology' AND a.entityId = 'React'
          RETURN a
          ORDER BY a.timestamp DESC
        `)

        auditLogs = result.records.map(record => record.get('a').properties)
      } finally {
        await session.close()
      }
    })

    Then('I should receive all audit logs for that entity', () => {
      expect(auditLogs.length).toBe(3)
      auditLogs.forEach(log => {
        expect(log.entityType).toBe('Technology')
        expect(log.entityId).toBe('React')
      })
    })

    Then('the logs should be ordered by timestamp descending', () => {
      for (let i = 0; i < auditLogs.length - 1; i++) {
        const current = new Date(auditLogs[i].timestamp)
        const next = new Date(auditLogs[i + 1].timestamp)
        expect(current >= next).toBe(true)
      }
    })
  })

  Scenario('Querying audit logs by operation type', ({ Given, When, Then }) => {
    Given('audit logs exist with various operations', async () => {
      const session = driver.session()
      try {
        const operations = ['CREATE', 'UPDATE', 'APPROVE', 'DELETE']
        for (const op of operations) {
          await session.run(`
            CREATE (a:AuditLog {
              id: $id,
              timestamp: datetime(),
              operation: $operation,
              entityType: 'Technology',
              entityId: 'React',
              userId: 'user123',
              source: 'UI'
            })
          `, {
            id: `audit-${op.toLowerCase()}`,
            operation: op
          })
        }
      } finally {
        await session.close()
      }
    })

    When('I query audit logs with operation "APPROVE"', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog)
          WHERE a.operation = 'APPROVE'
          RETURN a
        `)

        auditLogs = result.records.map(record => record.get('a').properties)
      } finally {
        await session.close()
      }
    })

    Then('I should only receive audit logs with operation "APPROVE"', () => {
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].operation).toBe('APPROVE')
    })
  })

  Scenario('Querying audit logs by time range', ({ Given, When, Then }) => {
    Given('audit logs exist from the past 30 days', async () => {
      const session = driver.session()
      try {
        // Create logs with different timestamps
        await session.run(`
          CREATE (a1:AuditLog {
            id: 'audit-old',
            timestamp: datetime() - duration('P20D'),
            operation: 'UPDATE',
            entityType: 'Technology',
            entityId: 'React',
            userId: 'user123',
            source: 'UI'
          }),
          (a2:AuditLog {
            id: 'audit-recent',
            timestamp: datetime() - duration('P3D'),
            operation: 'UPDATE',
            entityType: 'Technology',
            entityId: 'React',
            userId: 'user123',
            source: 'UI'
          })
        `)
      } finally {
        await session.close()
      }
    })

    When('I query audit logs from the last 7 days', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog)
          WHERE a.timestamp >= datetime() - duration('P7D')
          RETURN a
        `)

        auditLogs = result.records.map(record => record.get('a').properties)
      } finally {
        await session.close()
      }
    })

    Then('I should only receive logs from the last 7 days', () => {
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].id).toBe('audit-recent')
    })
  })

  Scenario('Recording approval operations', ({ When, Then }) => {
    When('I create an audit log for an approval:', async (table) => {
      const data = table.reduce((acc: any, row: any) => {
        acc[row.field] = row.value
        return acc
      }, {})

      const session = driver.session()
      try {
        auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const result = await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: $operation,
            entityType: $entityType,
            entityId: $entityId,
            userId: $userId,
            source: 'UI',
            metadata: {timeCategory: $timeCategory}
          })
          RETURN a
        `, {
          id: auditLogId,
          ...data
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should capture the approval details', () => {
      expect(auditLog.operation).toBe('APPROVE')
      expect(auditLog.entityType).toBe('Technology')
    })

    Then('the metadata should include the TIME category', () => {
      expect(auditLog.metadata.timeCategory).toBe('invest')
    })
  })

  Scenario('Recording SBOM operations', ({ When, Then }) => {
    When('I create an audit log for SBOM upload:', async (table) => {
      const data = table.reduce((acc: any, row: any) => {
        acc[row.field] = row.value
        return acc
      }, {})

      const session = driver.session()
      try {
        auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const result = await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: $operation,
            entityType: $entityType,
            entityId: $entityId,
            userId: $userId,
            source: $source,
            metadata: {componentCount: toInteger($componentCount)}
          })
          RETURN a
        `, {
          id: auditLogId,
          ...data
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should capture the SBOM details', () => {
      expect(auditLog.operation).toBe('SBOM_UPLOAD')
      expect(auditLog.source).toBe('SBOM')
    })

    Then('the metadata should include component count', () => {
      expect(auditLog.metadata.componentCount.toNumber()).toBe(150)
    })
  })

  Scenario('Tracking vulnerability detection', ({ When, Then }) => {
    When('I create an audit log for vulnerability detection:', async (table) => {
      const data = table.reduce((acc: any, row: any) => {
        acc[row.field] = row.value
        return acc
      }, {})

      const session = driver.session()
      try {
        auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const result = await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: $operation,
            entityType: $entityType,
            entityId: $entityId,
            userId: 'system',
            source: 'SYSTEM',
            metadata: {
              vulnerabilityId: $vulnerabilityId,
              severity: $severity
            }
          })
          RETURN a
        `, {
          id: auditLogId,
          ...data
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should capture the vulnerability details', () => {
      expect(auditLog.operation).toBe('VULNERABILITY_DETECTED')
      expect(auditLog.metadata.vulnerabilityId).toBe('CVE-2024-12345')
      expect(auditLog.metadata.severity).toBe('HIGH')
    })
  })

  Scenario('Using session and correlation IDs', ({ When, Then }) => {
    When('I create multiple audit logs with the same sessionId', async () => {
      const session = driver.session()
      const sessionId = 'session-abc-123'
      try {
        for (let i = 0; i < 3; i++) {
          await session.run(`
            CREATE (a:AuditLog {
              id: $id,
              timestamp: datetime(),
              operation: 'UPDATE',
              entityType: 'Technology',
              entityId: 'React',
              userId: 'user123',
              source: 'UI',
              sessionId: $sessionId
            })
          `, {
            id: `audit-session-${i}`,
            sessionId
          })
        }
      } finally {
        await session.close()
      }
    })

    Then('I should be able to query all logs for that session', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog)
          WHERE a.sessionId = 'session-abc-123'
          RETURN a
        `)

        auditLogs = result.records.map(record => record.get('a').properties)
      } finally {
        await session.close()
      }
    })

    Then('the logs should be grouped together', () => {
      expect(auditLogs.length).toBe(3)
      auditLogs.forEach(log => {
        expect(log.sessionId).toBe('session-abc-123')
      })
    })
  })

  Scenario('Filtering by source', ({ Given, When, Then }) => {
    Given('audit logs exist from different sources', async () => {
      const session = driver.session()
      try {
        const sources = ['UI', 'API', 'SBOM', 'SYSTEM']
        for (const source of sources) {
          await session.run(`
            CREATE (a:AuditLog {
              id: $id,
              timestamp: datetime(),
              operation: 'UPDATE',
              entityType: 'Technology',
              entityId: 'React',
              userId: 'user123',
              source: $source
            })
          `, {
            id: `audit-${source.toLowerCase()}`,
            source
          })
        }
      } finally {
        await session.close()
      }
    })

    When('I query audit logs from source "UI"', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog)
          WHERE a.source = 'UI'
          RETURN a
        `)

        auditLogs = result.records.map(record => record.get('a').properties)
      } finally {
        await session.close()
      }
    })

    Then('I should only receive logs from the UI source', () => {
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].source).toBe('UI')
    })
  })

  Scenario('Tagging audit logs', ({ When, Then }) => {
    When('I create an audit log with tags:', async (table) => {
      const tags = table.map((row: any) => row.tag)

      const session = driver.session()
      try {
        auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const result = await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: 'UPDATE',
            entityType: 'Technology',
            entityId: 'React',
            userId: 'user123',
            source: 'UI',
            tags: $tags
          })
          RETURN a
        `, {
          id: auditLogId,
          tags
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should have the specified tags', () => {
      expect(auditLog.tags).toContain('security')
      expect(auditLog.tags).toContain('critical')
      expect(auditLog.tags).toContain('compliance')
    })

    Then('I can query audit logs by tag', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog)
          WHERE 'security' IN a.tags
          RETURN a
        `)

        expect(result.records.length).toBe(1)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Audit log uniqueness', ({ When, Then }) => {
    When('I create an audit log with ID "audit-123"', async () => {
      const session = driver.session()
      try {
        await session.run(`
          CREATE (a:AuditLog {
            id: 'audit-123',
            timestamp: datetime(),
            operation: 'CREATE',
            entityType: 'Technology',
            entityId: 'React',
            userId: 'user123',
            source: 'UI'
          })
        `)
      } finally {
        await session.close()
      }
    })

    Then('the second creation should fail due to unique constraint', async () => {
      const session = driver.session()
      try {
        await expect(
          session.run(`
            CREATE (a:AuditLog {
              id: 'audit-123',
              timestamp: datetime(),
              operation: 'UPDATE',
              entityType: 'Technology',
              entityId: 'React',
              userId: 'user123',
              source: 'UI'
            })
          `)
        ).rejects.toThrow()
      } finally {
        await session.close()
      }
    })
  })
})
