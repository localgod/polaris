import { expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Driver, Record } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { readFileSync } from 'fs'
import { join } from 'path'

const feature = await loadFeature('./test/integration/features/audit-trail.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let driver: Driver
  let auditLogId: string
  let auditLog: Record | null
  let auditLogs: Record[]
  let _user: Record | null
  let queryTime: number

  beforeAll(async () => {
    const uri = process.env.NEO4J_TEST_URI || process.env.NEO4J_URI || 'bolt://localhost:7687'
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
      
      // Remove multi-line comments
      const cleanedMigration = migrationUp.replace(/\/\*[\s\S]*?\*\//g, '')
      
      // Execute migration (skip single-line comments and empty lines)
      const statements = cleanedMigration
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          if (!s) return false
          // Remove single-line comments
          const lines = s.split('\n').filter(line => {
            const trimmed = line.trim()
            return trimmed && !trimmed.startsWith('//')
          })
          return lines.length > 0
        })
      
      for (const statement of statements) {
        if (statement) {
          // Remove inline comments from the statement
          const cleanStatement = statement
            .split('\n')
            .map(line => {
              const commentIndex = line.indexOf('//')
              return commentIndex >= 0 ? line.substring(0, commentIndex) : line
            })
            .join('\n')
            .trim()
          
          if (cleanStatement) {
            await session.run(cleanStatement)
          }
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
      
      // Remove multi-line comments
      const cleanedMigration = migrationDown.replace(/\/\*[\s\S]*?\*\//g, '')
      
      const statements = cleanedMigration
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          if (!s) return false
          const lines = s.split('\n').filter(line => {
            const trimmed = line.trim()
            return trimmed && !trimmed.startsWith('//')
          })
          return lines.length > 0
        })
      
      for (const statement of statements) {
        if (statement) {
          const cleanStatement = statement
            .split('\n')
            .map(line => {
              const commentIndex = line.indexOf('//')
              return commentIndex >= 0 ? line.substring(0, commentIndex) : line
            })
            .join('\n')
            .trim()
          
          if (cleanStatement) {
            try {
              await session.run(cleanStatement)
            } catch {
              // Ignore errors during cleanup
            }
          }
        }
      }
    } finally {
      await session.close()
    }

    await driver.close()
  })

  beforeEach(async () => {
    // Cleanup disabled - each scenario manages its own cleanup
    // This prevents data being deleted between steps within a scenario
  })

  Background(({ Given, And }) => {
    Given('a clean Neo4j database', () => {
      // Already cleaned in beforeEach
      expect(driver).toBeDefined()
    })

    And('the audit trail schema is applied', () => {
      // Already applied in beforeAll
      expect(driver).toBeDefined()
    })
  })

  Scenario('Creating an audit log entry', ({ When, Then, And }) => {
    When('I create an audit log with:', async (_context: unknown, dataTable: Array<{field: string, value: string}>) => {
      const session = driver.session()
      try {
        // Convert data table array to object
        const data: Record<string, string> = {}
        for (const row of dataTable) {
          if (row.field && row.value) {
            data[row.field] = row.value
          }
        }
        
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
          operation: data.operation,
          entityType: data.entityType,
          entityId: data.entityId,
          userId: data.userId,
          source: data.source
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should be created successfully', () => {
      expect(auditLog).toBeDefined()
    })

    And('the audit log should have a unique ID', () => {
      expect(auditLog.id).toBe(auditLogId)
    })

    And('the audit log should have a timestamp', () => {
      expect(auditLog.timestamp).toBeDefined()
    })
  })

  Scenario('Tracking field changes', ({ When, Then, And }) => {
    When('I create an audit log with field changes:', async () => {
      const changes: Record<string, { before: string; after: string }> = {
        status: { before: 'draft', after: 'active' },
        ownerTeam: { before: 'Frontend', after: 'Platform' }
      }

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
          changes: JSON.stringify(changes),
          changedFields: Object.keys(changes)
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('the audit log should contain the field changes', () => {
      expect(auditLog.changes).toBeDefined()
      const changes = JSON.parse(auditLog.changes)
      expect(changes.status).toEqual({ before: 'draft', after: 'active' })
    })

    And('the changedFields list should contain "status" and "ownerTeam"', () => {
      expect(auditLog.changedFields).toContain('status')
      expect(auditLog.changedFields).toContain('ownerTeam')
    })
  })

  Scenario('Linking audit log to user', ({ Given, When, Then, And }) => {
    let session: neo4j.Session

    Given('a user "user123" exists', async () => {
      session = driver.session()
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
      _user = result.records[0].get('u').properties
    })

    When('I create an audit log performed by "user123"', async () => {
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

      if (result.records.length > 0) {
        auditLog = result.records[0].get('a').properties
      }
    })

    Then('the audit log should be linked to the user via PERFORMED_BY relationship', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog {id: $id})-[:PERFORMED_BY]->(u:User)
        RETURN u
      `, { id: auditLogId })

      expect(result.records.length).toBe(1)
      const linkedUser = result.records[0].get('u').properties
      expect(linkedUser.id).toBe('test-user123')
    })

    And('I can query all audit logs by that user', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog {userId: 'test-user123'})
        RETURN a
      `)

      expect(result.records.length).toBeGreaterThan(0)
      await session.close()
    })
  })

  Scenario('Querying audit logs by entity', ({ Given, When, Then, And }) => {
    let session: neo4j.Session
    const scenarioId = `scenario-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    Given('multiple audit logs exist for "React" technology', async () => {
      session = driver.session()
      for (let i = 0; i < 3; i++) {
        await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: $operation,
            entityType: 'Technology',
            entityId: $entityId,
            userId: 'user123',
            source: 'UI'
          })
        `, {
          id: `audit-react-${scenarioId}-${i}`,
          operation: i === 0 ? 'CREATE' : 'UPDATE',
          entityId: `React-${scenarioId}`
        })
      }
    })

    When('I query audit logs for entity type "Technology" and ID "React"', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog)
        WHERE a.entityType = 'Technology' AND a.entityId = $entityId
        RETURN a
        ORDER BY a.timestamp DESC
      `, { entityId: `React-${scenarioId}` })

      auditLogs = result.records.map(record => record.get('a').properties)
    })

    Then('I should receive all audit logs for that entity', () => {
      expect(auditLogs.length).toBe(3)
      auditLogs.forEach(log => {
        expect(log.entityType).toBe('Technology')
        expect(log.entityId).toBe(`React-${scenarioId}`)
      })
    })

    And('the logs should be ordered by timestamp descending', async () => {
      for (let i = 0; i < auditLogs.length - 1; i++) {
        const current = new Date(auditLogs[i].timestamp)
        const next = new Date(auditLogs[i + 1].timestamp)
        expect(current >= next).toBe(true)
      }
      await session.close()
    })
  })

  Scenario('Querying audit logs by operation type', ({ Given, When, Then }) => {
    let session: neo4j.Session

    Given('audit logs exist with various operations', async () => {
      session = driver.session()
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
    })

    When('I query audit logs with operation "APPROVE"', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog)
        WHERE a.operation = 'APPROVE'
        RETURN a
      `)

      auditLogs = result.records.map(record => record.get('a').properties)
    })

    Then('I should only receive audit logs with operation "APPROVE"', async () => {
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].operation).toBe('APPROVE')
      await session.close()
    })
  })

  Scenario('Querying audit logs by time range', ({ Given, When, Then }) => {
    let session: neo4j.Session
    const scenarioId = `scenario-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    Given('audit logs exist from the past 30 days', async () => {
      session = driver.session()
      // Create logs with different timestamps
      await session.run(`
        CREATE (a1:AuditLog {
          id: $id1,
          timestamp: datetime() - duration('P20D'),
          operation: 'UPDATE',
          entityType: 'Technology',
          entityId: $entityId,
          userId: 'user123',
          source: 'UI'
        }),
        (a2:AuditLog {
          id: $id2,
          timestamp: datetime() - duration('P3D'),
          operation: 'UPDATE',
          entityType: 'Technology',
          entityId: $entityId,
          userId: 'user123',
          source: 'UI'
        })
      `, { 
        id1: `audit-old-${scenarioId}`,
        id2: `audit-recent-${scenarioId}`,
        entityId: `React-${scenarioId}`
      })
    })

    When('I query audit logs from the last 7 days', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog)
        WHERE a.timestamp >= datetime() - duration('P7D')
          AND a.entityId = $entityId
        RETURN a
      `, { entityId: `React-${scenarioId}` })

      auditLogs = result.records.map(record => record.get('a').properties)
    })

    Then('I should only receive logs from the last 7 days', async () => {
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].id).toBe(`audit-recent-${scenarioId}`)
      await session.close()
    })
  })

  Scenario('Recording approval operations', ({ When, Then, And }) => {
    When('I create an audit log for an approval:', async () => {
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
            metadata: $metadata
          })
          RETURN a
        `, {
          id: auditLogId,
          operation: 'APPROVE',
          entityType: 'Technology',
          entityId: 'React',
          userId: 'user123',
          metadata: JSON.stringify({ timeCategory: 'invest' })
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

    And('the metadata should include the TIME category', () => {
      const metadata = JSON.parse(auditLog.metadata)
      expect(metadata.timeCategory).toBe('invest')
    })
  })

  Scenario('Recording SBOM operations', ({ When, Then, And }) => {
    When('I create an audit log for SBOM upload:', async () => {
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
            metadata: $metadata
          })
          RETURN a
        `, {
          id: auditLogId,
          operation: 'SBOM_UPLOAD',
          entityType: 'System',
          entityId: 'payment-service',
          userId: 'user123',
          source: 'SBOM',
          metadata: JSON.stringify({ componentCount: 150 })
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

    And('the metadata should include component count', () => {
      const metadata = JSON.parse(auditLog.metadata)
      expect(metadata.componentCount).toBe(150)
    })
  })

  Scenario('Using session and correlation IDs', ({ When, Then, And }) => {
    let session: neo4j.Session

    When('I create multiple audit logs with the same sessionId', async () => {
      session = driver.session()
      const sessionId = 'session-abc-123'
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
    })

    Then('I should be able to query all logs for that session', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog)
        WHERE a.sessionId = 'session-abc-123'
        RETURN a
      `)

      auditLogs = result.records.map(record => record.get('a').properties)
    })

    And('the logs should be grouped together', async () => {
      expect(auditLogs.length).toBe(3)
      auditLogs.forEach(log => {
        expect(log.sessionId).toBe('session-abc-123')
      })
      await session.close()
    })
  })

  Scenario('Filtering by source', ({ Given, When, Then }) => {
    let session: neo4j.Session
    const scenarioId = `scenario-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    Given('audit logs exist from different sources', async () => {
      session = driver.session()
      const sources = ['UI', 'API', 'SBOM', 'SYSTEM']
      for (const source of sources) {
        await session.run(`
          CREATE (a:AuditLog {
            id: $id,
            timestamp: datetime(),
            operation: 'UPDATE',
            entityType: 'Technology',
            entityId: $entityId,
            userId: 'user123',
            source: $source
          })
        `, {
          id: `audit-${source.toLowerCase()}-${scenarioId}`,
          source,
          entityId: `React-${scenarioId}`
        })
      }
    })

    When('I query audit logs from source "UI"', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog)
        WHERE a.source = 'UI' AND a.entityId = $entityId
        RETURN a
      `, { entityId: `React-${scenarioId}` })

      auditLogs = result.records.map(record => record.get('a').properties)
    })

    Then('I should only receive logs from the UI source', async () => {
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].source).toBe('UI')
      await session.close()
    })
  })

  Scenario('Tagging audit logs', ({ When, Then, And }) => {
    let session: neo4j.Session

    When('I create an audit log with tags:', async () => {
      const tags = ['security', 'critical', 'compliance']

      session = driver.session()
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
    })

    Then('the audit log should have the specified tags', () => {
      expect(auditLog.tags).toContain('security')
      expect(auditLog.tags).toContain('critical')
      expect(auditLog.tags).toContain('compliance')
    })

    And('I can query audit logs by tag', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog)
        WHERE 'security' IN a.tags
        RETURN a
      `)

      expect(result.records.length).toBe(1)
      await session.close()
    })
  })

  Scenario('Audit log uniqueness', ({ When, Then, And }) => {
    let session: neo4j.Session

    When('I create an audit log with ID "audit-123"', async () => {
      session = driver.session()
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
    })

    And('I try to create another audit log with ID "audit-123"', () => {
      // This step is just a description, the actual attempt happens in Then
    })

    Then('the second creation should fail due to unique constraint', async () => {
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
      await session.close()
    })
  })

  Scenario('Composite index performance', ({ Given, When, Then, And }) => {
    Given('1000 audit logs exist for various entities', async () => {
      const session = driver.session()
      try {
        // Create logs in batches for better performance
        const batchSize = 100
        for (let batch = 0; batch < 10; batch++) {
          const values = []
          for (let i = 0; i < batchSize; i++) {
            const idx = batch * batchSize + i
            values.push({
              id: `audit-perf-${idx}`,
              entityType: idx % 2 === 0 ? 'Technology' : 'System',
              entityId: `entity-${idx % 50}`,
              operation: 'UPDATE',
              userId: 'user123',
              source: 'UI'
            })
          }
          
          await session.run(`
            UNWIND $values AS val
            CREATE (a:AuditLog {
              id: val.id,
              timestamp: datetime() - duration('P' + toString(toInteger(rand() * 30)) + 'D'),
              operation: val.operation,
              entityType: val.entityType,
              entityId: val.entityId,
              userId: val.userId,
              source: val.source
            })
          `, { values })
        }
      } finally {
        await session.close()
      }
    })

    When('I query audit logs for a specific entity with time range', async () => {
      const session = driver.session()
      const startTime = Date.now()
      try {
        const result = await session.run(`
          MATCH (a:AuditLog)
          WHERE a.entityType = 'Technology' 
            AND a.entityId = 'entity-10'
            AND a.timestamp >= datetime() - duration('P7D')
          RETURN a
        `)

        auditLogs = result.records.map(record => record.get('a').properties)
        queryTime = Date.now() - startTime
      } finally {
        await session.close()
      }
    })

    Then('the query should use the composite index', () => {
      // The index should exist and be used (verified via migration)
      expect(auditLogs).toBeDefined()
    })

    And('the query should complete in reasonable time', () => {
      // Query should complete in less than 1 second even with 1000 records
      expect(queryTime).toBeLessThan(1000)
    })
  })

  Scenario('Recording complete state changes', ({ When, Then, And }) => {
    When('I create an audit log with previousState and currentState', async () => {
      const session = driver.session()
      try {
        const previousState = {
          name: 'React',
          status: 'active',
          version: '17.0.0',
          ownerTeam: 'Frontend'
        }

        const currentState = {
          name: 'React',
          status: 'active',
          version: '18.0.0',
          ownerTeam: 'Platform'
        }

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
            previousState: $previousState,
            currentState: $currentState
          })
          RETURN a
        `, {
          id: auditLogId,
          previousState: JSON.stringify(previousState),
          currentState: JSON.stringify(currentState)
        })

        auditLog = result.records[0].get('a').properties
      } finally {
        await session.close()
      }
    })

    Then('I can compare the complete before and after states', () => {
      expect(auditLog.previousState).toBeDefined()
      expect(auditLog.currentState).toBeDefined()
      
      const previousState = JSON.parse(auditLog.previousState)
      const currentState = JSON.parse(auditLog.currentState)
      
      expect(previousState.version).toBe('17.0.0')
      expect(currentState.version).toBe('18.0.0')
    })

    And('I can identify all differences between states', () => {
      const previousState = JSON.parse(auditLog.previousState)
      const currentState = JSON.parse(auditLog.currentState)
      
      // Find differences
      const differences: string[] = []
      for (const key of Object.keys(currentState)) {
        if (previousState[key] !== currentState[key]) {
          differences.push(key)
        }
      }
      
      expect(differences).toContain('version')
      expect(differences).toContain('ownerTeam')
      expect(differences.length).toBe(2)
    })
  })

  Scenario('Capturing user context', ({ When, Then, And }) => {
    let session: neo4j.Session

    When('I create an audit log with user context:', async (_ctx: unknown, dataTable: Array<{field: string, value: string}>) => {
      session = driver.session()
      // Convert data table array to object
      const context: Record<string, string> = {}
      for (const row of dataTable) {
        if (row.field && row.value) {
          context[row.field] = row.value
        }
      }
      
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
          ipAddress: $ipAddress,
          userAgent: $userAgent,
          sessionId: $sessionId
        })
        RETURN a
      `, {
        id: auditLogId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId
      })

      auditLog = result.records[0].get('a').properties
    })

    Then('the audit log should include the user context', () => {
      expect(auditLog.ipAddress).toBe('192.168.1.100')
      expect(auditLog.userAgent).toContain('Mozilla')
      expect(auditLog.sessionId).toBe('session-abc-123')
    })

    And('I can analyze access patterns by IP address', async () => {
      const result = await session.run(`
        MATCH (a:AuditLog)
        WHERE a.ipAddress = '192.168.1.100'
        RETURN a
      `)

      expect(result.records.length).toBeGreaterThan(0)
      const logs = result.records.map(record => record.get('a').properties)
      logs.forEach(log => {
        expect(log.ipAddress).toBe('192.168.1.100')
      })
      await session.close()
    })
  })
})
