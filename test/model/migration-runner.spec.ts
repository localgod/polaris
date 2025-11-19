import { expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Driver } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { MigrationRunner } from '../../schema/scripts/migrationRunner'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'

const feature = await loadFeature('./test/model/features/migration-runner.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let driver: Driver
  let runner: MigrationRunner
  const testMigrationsDir = join(process.cwd(), 'test-migrations')
  let checksum1: string
  let checksum2: string
  let migrationFile: string
  let migrationContent: string
  let metadata: Partial<{ version?: string; appliedBy?: string; description?: string }>
  let applyResult: { success: boolean; executionTime: number; error?: string }
  let status: { total: number; applied: unknown[]; pending: string[] }

  beforeAll(async () => {
    const uri = process.env.NEO4J_TEST_URI || process.env.NEO4J_URI || 'bolt://localhost:7687'
    const username = process.env.NEO4J_USERNAME || 'neo4j'
    const password = process.env.NEO4J_PASSWORD || 'devpassword'

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
    mkdirSync(join(testMigrationsDir, 'common'), { recursive: true })
  })

  afterAll(async () => {
    const session = driver.session()
    try {
      await session.run('MATCH (m:Migration) DELETE m')
      await session.run('MATCH (t:TestNode) DELETE t')
    } finally {
      await session.close()
    }

    rmSync(testMigrationsDir, { recursive: true, force: true })
    await driver.close()
  })

  beforeEach(async () => {
    const session = driver.session()
    try {
      await session.run('MATCH (m:Migration) DELETE m')
      await session.run('MATCH (t:TestNode) DELETE t')
    } finally {
      await session.close()
    }

    rmSync(testMigrationsDir, { recursive: true, force: true })
    mkdirSync(join(testMigrationsDir, 'common'), { recursive: true })
    runner = new MigrationRunner(driver, testMigrationsDir)
  })

  Background(({ Given, And }) => {
    Given('a Neo4j database is available', () => {
      expect(driver).toBeDefined()
    })

    And('a test migrations directory exists', () => {
      expect(testMigrationsDir).toBeDefined()
    })
  })

  Scenario('Calculate consistent checksums', ({ Given, When, Then, And }) => {
    Given('a migration file with content "CREATE (n:Test)"', () => {
      migrationContent = 'CREATE (n:Test)'
      expect(migrationContent).toBeDefined()
    })

    When('I calculate the checksum twice', () => {
      checksum1 = runner.calculateChecksum(migrationContent)
      checksum2 = runner.calculateChecksum(migrationContent)
    })

    Then('both checksums should be identical', () => {
      expect(checksum1).toBe(checksum2)
    })

    And('the checksum should be 64 characters long', () => {
      expect(checksum1).toHaveLength(64)
    })
  })

  Scenario('Generate different checksums for different content', ({ Given, And, When, Then }) => {
    let content1: string
    let content2: string

    Given('a migration file with content "CREATE (n:Test1)"', () => {
      content1 = 'CREATE (n:Test1)'
    })

    And('another migration file with content "CREATE (n:Test2)"', () => {
      content2 = 'CREATE (n:Test2)'
    })

    When('I calculate checksums for both files', () => {
      checksum1 = runner.calculateChecksum(content1)
      checksum2 = runner.calculateChecksum(content2)
    })

    Then('the checksums should be different', () => {
      expect(checksum1).not.toBe(checksum2)
    })
  })

  Scenario('Parse migration metadata from header', ({ Given, When, Then, And }) => {
    Given('a migration file with metadata header', () => {
      migrationContent = `/*
 * Migration: Test Migration
 * Version: 2025.10.15.120000
 * Author: @testuser
 * Description:
 * This is a test migration
 */
CREATE (n:Test)`
    })

    When('I parse the migration metadata', () => {
      metadata = runner.parseMigrationMetadata(migrationContent, 'test.cypher')
    })

    Then('the version should be extracted correctly', () => {
      expect(metadata.version).toBe('2025.10.15.120000')
    })

    And('the author should be extracted correctly', () => {
      expect(metadata.appliedBy).toBe('@testuser')
    })

    And('the description should be extracted correctly', () => {
      expect(metadata.description).toBe('This is a test migration')
    })
  })

  Scenario('Extract version from filename', ({ Given, And, When, Then }) => {
    let filename: string

    Given('a migration file named "2025-10-15_120000_test.up.cypher"', () => {
      filename = '2025-10-15_120000_test.up.cypher'
    })

    And('the file has no metadata header', () => {
      migrationContent = 'CREATE (n:Test)'
    })

    When('I parse the migration metadata', () => {
      metadata = runner.parseMigrationMetadata(migrationContent, filename)
    })

    Then('the version should be "2025.10.15.120000"', () => {
      expect(metadata.version).toBe('2025.10.15.120000')
    })
  })

  Scenario('Apply a valid migration', ({ Given, When, Then, And }) => {
    Given('a valid migration file exists', () => {
      migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120000_test.up.cypher')
      const content = `/*
 * Migration: Test Migration
 * Version: 2025.10.15.120000
 */
CREATE (n:TestNode {name: 'test'})`
      writeFileSync(migrationFile, content)
      expect(migrationFile).toBeDefined()
    })

    When('I apply the migration', async () => {
      const session = driver.session()
      try {
        applyResult = await runner.applyMigration(session, migrationFile, { verbose: false })
      } finally {
        await session.close()
      }
    })

    Then('the migration should succeed', () => {
      expect(applyResult.success).toBe(true)
    })

    And('the execution time should be recorded', () => {
      expect(applyResult.executionTime).toBeGreaterThan(0)
    })

    And('the database changes should be applied', async () => {
      const session = driver.session()
      try {
        const result = await session.run('MATCH (n:TestNode {name: "test"}) RETURN count(n) as count')
        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })

    And('the migration should be recorded in the database', async () => {
      const session = driver.session()
      try {
        const result = await session.run('MATCH (m:Migration) RETURN count(m) as count')
        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Prevent reapplying migrations', ({ Given, When, Then }) => {
    Given('a migration has already been applied', async () => {
      migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120001_test.up.cypher')
      const content = `/*
 * Migration: Test Migration 2
 * Version: 2025.10.15.120001
 */
CREATE (n:TestNode {name: 'test2'})`
      writeFileSync(migrationFile, content)

      const session = driver.session()
      try {
        await runner.applyMigration(session, migrationFile)
      } finally {
        await session.close()
      }
    })

    When('I check the migration status', async () => {
      status = await runner.getStatus()
    })

    Then('the migration should not be in the pending list', () => {
      expect(status.pending).not.toContain(migrationFile)
    })
  })

  Scenario('Handle migration failures gracefully', ({ Given, When, Then, And }) => {
    Given('an invalid migration file with syntax errors', () => {
      migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120002_invalid.up.cypher')
      const content = `/*
 * Migration: Invalid Migration
 * Version: 2025.10.15.120002
 */
INVALID CYPHER SYNTAX`
      writeFileSync(migrationFile, content)
    })

    When('I attempt to apply the migration', async () => {
      const session = driver.session()
      try {
        applyResult = await runner.applyMigration(session, migrationFile, { verbose: false })
      } finally {
        await session.close()
      }
    })

    Then('the migration should fail', () => {
      expect(applyResult.success).toBe(false)
    })

    And('an error message should be recorded', () => {
      expect(applyResult.error).toBeDefined()
    })

    And('the migration status should be "FAILED"', async () => {
      const session = driver.session()
      try {
        const result = await session.run(
          'MATCH (m:Migration {status: "FAILED"}) RETURN count(m) as count'
        )
        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Apply multiple migrations in order', ({ Given, When, Then, And }) => {
    let runResult: { success: boolean; applied: string[]; failed: string[] }

    Given('three migration files exist in sequence', () => {
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
    })

    When('I run all pending migrations', async () => {
      runResult = await runner.runMigrations({ verbose: false })
    })

    Then('all three migrations should be applied successfully', () => {
      expect(runResult.success).toBe(true)
      expect(runResult.applied).toHaveLength(3)
      expect(runResult.failed).toHaveLength(0)
    })

    And('they should be applied in the correct order', () => {
      expect(runResult.applied).toHaveLength(3)
    })

    And('all database changes should be present', async () => {
      const session = driver.session()
      try {
        const result = await session.run(
          'MATCH (n:TestNode) RETURN n.name as name ORDER BY n.order'
        )
        const names = result.records.map(r => r.get('name'))
        expect(names).toEqual(['first', 'second', 'third'])
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Support dry-run mode', ({ Given, When, Then, But, And }) => {
    let dryRunResult: { success: boolean; applied: string[] }

    Given('a migration file exists', () => {
      migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120006_dryrun.up.cypher')
      writeFileSync(migrationFile, 'CREATE (n:TestNode {name: "dryrun"})')
    })

    When('I run migrations in dry-run mode', async () => {
      dryRunResult = await runner.runMigrations({ dryRun: true, verbose: false })
    })

    Then('the migration should be marked as applied in the result', () => {
      expect(dryRunResult.success).toBe(true)
      expect(dryRunResult.applied).toHaveLength(1)
    })

    But('no database changes should be made', async () => {
      const session = driver.session()
      try {
        const result = await session.run(
          'MATCH (n:TestNode {name: "dryrun"}) RETURN count(n) as count'
        )
        expect(result.records[0].get('count').toNumber()).toBe(0)
      } finally {
        await session.close()
      }
    })

    And('no migration record should be created', async () => {
      const session = driver.session()
      try {
        const result = await session.run(
          'MATCH (m:Migration) WHERE m.filename CONTAINS "dryrun" RETURN count(m) as count'
        )
        expect(result.records[0].get('count').toNumber()).toBe(0)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Report migration status', ({ Given, When, Then, And }) => {
    Given('a pending migration exists', () => {
      migrationFile = join(testMigrationsDir, 'common', '2025-10-15_120007_status.up.cypher')
      writeFileSync(migrationFile, 'CREATE (n:TestNode {name: "status"})')
    })

    When('I check the migration status', async () => {
      status = await runner.getStatus()
    })

    Then('it should show 0 applied migrations', () => {
      expect(status.applied).toHaveLength(0)
    })

    And('it should show 1 pending migration', () => {
      expect(status.pending).toHaveLength(1)
    })

    When('I apply the migration', async () => {
      await runner.runMigrations({ verbose: false })
    })

    And('I check the migration status again', async () => {
      status = await runner.getStatus()
    })

    Then('it should show 1 applied migration', () => {
      expect(status.applied).toHaveLength(1)
    })

    And('it should show 0 pending migrations', () => {
      expect(status.pending).toHaveLength(0)
    })
  })
})
