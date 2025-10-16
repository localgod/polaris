import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver'
import { MigrationRunner } from './migrationRunner'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'

describe('MigrationRunner', () => {
  let driver: Driver
  let runner: MigrationRunner
  const testMigrationsDir = join(process.cwd(), 'test-migrations')

  beforeAll(async () => {
    // Connect to test database
    const uri = process.env.NEO4J_TEST_URI || process.env.NEO4J_URI || 'neo4j://neo4j:7687'
    const username = process.env.NEO4J_USERNAME || 'neo4j'
    const password = process.env.NEO4J_PASSWORD || 'devpassword'

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password))

    // Create test migrations directory
    mkdirSync(join(testMigrationsDir, 'common'), { recursive: true })
  })

  afterAll(async () => {
    // Clean up test database
    const session = driver.session()
    try {
      await session.run('MATCH (m:Migration) DELETE m')
      await session.run('MATCH (t:TestNode) DELETE t')
    } finally {
      await session.close()
    }

    // Clean up test migrations directory
    rmSync(testMigrationsDir, { recursive: true, force: true })

    await driver.close()
  })

  beforeEach(async () => {
    // Clean migrations before each test
    const session = driver.session()
    try {
      await session.run('MATCH (m:Migration) DELETE m')
      await session.run('MATCH (t:TestNode) DELETE t')
    } finally {
      await session.close()
    }

    runner = new MigrationRunner(driver, testMigrationsDir)
  })

  describe('calculateChecksum', () => {
    it('should generate consistent checksums', () => {
      const content = 'CREATE (n:Test)'
      const checksum1 = runner.calculateChecksum(content)
      const checksum2 = runner.calculateChecksum(content)

      expect(checksum1).toBe(checksum2)
      expect(checksum1).toHaveLength(64) // SHA256 hex length
    })

    it('should generate different checksums for different content', () => {
      const content1 = 'CREATE (n:Test1)'
      const content2 = 'CREATE (n:Test2)'

      const checksum1 = runner.calculateChecksum(content1)
      const checksum2 = runner.calculateChecksum(content2)

      expect(checksum1).not.toBe(checksum2)
    })
  })

  describe('parseMigrationMetadata', () => {
    it('should parse migration metadata from header', () => {
      const content = `/*
 * Migration: Test Migration
 * Version: 2025.10.15.120000
 * Author: @testuser
 * Description:
 * This is a test migration
 */
CREATE (n:Test)`

      const metadata = runner.parseMigrationMetadata(content, 'test.cypher')

      expect(metadata.version).toBe('2025.10.15.120000')
      expect(metadata.appliedBy).toBe('@testuser')
      expect(metadata.description).toBe('This is a test migration')
    })

    it('should extract version from filename if not in header', () => {
      const content = 'CREATE (n:Test)'
      const filename = '2025-10-15_120000_test.up.cypher'

      const metadata = runner.parseMigrationMetadata(content, filename)

      expect(metadata.version).toBe('2025.10.15.120000')
    })
  })

  describe('applyMigration', () => {
    it('should apply a valid migration', async () => {
      const migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120000_test.up.cypher')
      const content = `/*
 * Migration: Test Migration
 * Version: 2025.10.15.120000
 */
CREATE (n:TestNode {name: 'test'})`

      writeFileSync(migrationFile, content)

      const session = driver.session()
      try {
        const result = await runner.applyMigration(session, migrationFile, { verbose: false })

        expect(result.success).toBe(true)
        expect(result.executionTime).toBeGreaterThan(0)

        // Verify node was created
        const checkResult = await session.run('MATCH (n:TestNode {name: "test"}) RETURN count(n) as count')
        expect(checkResult.records[0].get('count').toNumber()).toBe(1)

        // Verify migration was recorded
        const migrationResult = await session.run('MATCH (m:Migration) RETURN count(m) as count')
        expect(migrationResult.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })

    it('should not reapply an already applied migration', async () => {
      const migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120001_test.up.cypher')
      const content = `/*
 * Migration: Test Migration 2
 * Version: 2025.10.15.120001
 */
CREATE (n:TestNode {name: 'test2'})`

      writeFileSync(migrationFile, content)

      const session = driver.session()
      try {
        // Apply first time
        await runner.applyMigration(session, migrationFile)

        // Try to apply again
        const status = await runner.getStatus()
        expect(status.pending).not.toContain(migrationFile)
      } finally {
        await session.close()
      }
    })

    it('should handle migration failures gracefully', async () => {
      const migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120002_invalid.up.cypher')
      const content = `/*
 * Migration: Invalid Migration
 * Version: 2025.10.15.120002
 */
INVALID CYPHER SYNTAX`

      writeFileSync(migrationFile, content)

      const session = driver.session()
      try {
        const result = await runner.applyMigration(session, migrationFile, { verbose: false })

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()

        // Verify migration was recorded as failed
        const migrationResult = await session.run(
          'MATCH (m:Migration {status: "FAILED"}) RETURN count(m) as count'
        )
        expect(migrationResult.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })
  })

  describe('runMigrations', () => {
    it('should apply multiple migrations in order', async () => {
      // Create multiple migration files
      const migrations = [
        {
          file: '2025-10-15_120003_first.up.cypher',
          content: 'CREATE (n:TestNode {name: "first", order: 1})'
        },
        {
          file: '2025-10-15_120004_second.up.cypher',
          content: 'CREATE (n:TestNode {name: "second", order: 2})'
        },
        {
          file: '2025-10-15_120005_third.up.cypher',
          content: 'CREATE (n:TestNode {name: "third", order: 3})'
        }
      ]

      migrations.forEach(m => {
        writeFileSync(join(testMigrationsDir, 'common', m.file), m.content)
      })

      const result = await runner.runMigrations({ verbose: false })

      expect(result.success).toBe(true)
      expect(result.applied).toHaveLength(3)
      expect(result.failed).toHaveLength(0)

      // Verify all nodes were created
      const session = driver.session()
      try {
        const checkResult = await session.run(
          'MATCH (n:TestNode) RETURN n.name as name ORDER BY n.order'
        )
        const names = checkResult.records.map(r => r.get('name'))
        expect(names).toEqual(['first', 'second', 'third'])
      } finally {
        await session.close()
      }
    })

    it('should support dry-run mode', async () => {
      const migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120006_dryrun.up.cypher')
      writeFileSync(migrationFile, 'CREATE (n:TestNode {name: "dryrun"})')

      const result = await runner.runMigrations({ dryRun: true, verbose: false })

      expect(result.success).toBe(true)
      expect(result.applied).toHaveLength(1)

      // Verify node was NOT created
      const session = driver.session()
      try {
        const checkResult = await session.run(
          'MATCH (n:TestNode {name: "dryrun"}) RETURN count(n) as count'
        )
        expect(checkResult.records[0].get('count').toNumber()).toBe(0)

        // Verify migration was NOT recorded
        const migrationResult = await session.run(
          'MATCH (m:Migration) WHERE m.filename CONTAINS "dryrun" RETURN count(m) as count'
        )
        expect(migrationResult.records[0].get('count').toNumber()).toBe(0)
      } finally {
        await session.close()
      }
    })
  })

  describe('getStatus', () => {
    it('should return correct migration status', async () => {
      const migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120007_status.up.cypher')
      writeFileSync(migrationFile, 'CREATE (n:TestNode {name: "status"})')

      // Before applying
      let status = await runner.getStatus()
      expect(status.applied).toHaveLength(0)
      expect(status.pending).toHaveLength(1)

      // After applying
      await runner.runMigrations({ verbose: false })
      status = await runner.getStatus()
      expect(status.applied).toHaveLength(1)
      expect(status.pending).toHaveLength(0)
    })
  })
})
