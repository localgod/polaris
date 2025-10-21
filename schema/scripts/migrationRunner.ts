import type { Driver, Session } from 'neo4j-driver'
import { createHash } from 'crypto'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import type { MigrationMetadata, MigrationOptions, MigrationResult } from './types'

export class MigrationRunner {
  private driver: Driver
  private migrationsDir: string

  constructor(driver: Driver, migrationsDir?: string) {
    this.driver = driver
    this.migrationsDir = migrationsDir || resolve('./src/db/migrations')
  }

  /**
   * Get list of applied migrations from database
   */
  async getAppliedMigrations(session: Session): Promise<MigrationMetadata[]> {
    const result = await session.run(`
      MATCH (m:Migration)
      RETURN m.filename AS filename,
             m.version AS version,
             m.checksum AS checksum,
             m.appliedAt AS appliedAt,
             m.appliedBy AS appliedBy,
             m.executionTime AS executionTime,
             m.status AS status,
             m.description AS description
      ORDER BY m.appliedAt ASC
    `)

    return result.records.map(record => {
      const executionTime = record.get('executionTime')
      return {
        filename: record.get('filename'),
        version: record.get('version'),
        checksum: record.get('checksum'),
        appliedAt: record.get('appliedAt')?.toStandardDate(),
        appliedBy: record.get('appliedBy'),
        executionTime: executionTime ? (typeof executionTime.toNumber === 'function' ? executionTime.toNumber() : executionTime) : undefined,
        status: record.get('status'),
        description: record.get('description')
      }
    })
  }

  /**
   * Get list of pending migrations from filesystem
   */
  getPendingMigrations(applied: MigrationMetadata[], environment: string = 'common'): string[] {
    const appliedFiles = new Set(applied.map(m => m.filename))
    const dirs = [join(this.migrationsDir, 'common')]
    
    if (environment !== 'common') {
      dirs.push(join(this.migrationsDir, environment))
    }

    const allFiles: string[] = []
    for (const dir of dirs) {
      if (existsSync(dir)) {
        const files = readdirSync(dir)
          .filter(f => f.endsWith('.up.cypher'))
          .map(f => join(dir, f))
        allFiles.push(...files)
      }
    }

    return allFiles
      .filter(f => !appliedFiles.has(f))
      .sort()
  }

  /**
   * Calculate checksum for migration file
   */
  calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Validate that applied migration hasn't been modified
   */
  async validateMigration(
    session: Session,
    filename: string,
    content: string
  ): Promise<void> {
    const checksum = this.calculateChecksum(content)
    const result = await session.run(
      'MATCH (m:Migration {filename: $filename}) RETURN m.checksum AS stored',
      { filename }
    )

    if (result.records.length > 0) {
      const stored = result.records[0].get('stored')
      if (stored && stored !== checksum) {
        throw new Error(
          `Migration ${filename} has been modified after application! ` +
          `Expected checksum: ${stored}, Got: ${checksum}`
        )
      }
    }
  }

  /**
   * Parse migration metadata from file header
   */
  parseMigrationMetadata(content: string, filename: string): Partial<MigrationMetadata> {
    const versionMatch = content.match(/\* Version: (.+)/)
    const authorMatch = content.match(/\* Author: (.+)/)
    const descMatch = content.match(/\* Description:\s*\n \* (.+)/)
    const depsMatch = content.match(/\* Dependencies:\s*\n((?:\s*\* - .+\n?)+)/)

    const dependencies = depsMatch
      ? depsMatch[1]
          .split('\n')
          .map(line => line.trim().replace(/^\* - /, ''))
          .filter(Boolean)
      : []

    return {
      version: versionMatch?.[1]?.trim() || this.extractVersionFromFilename(filename),
      appliedBy: authorMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim(),
      dependencies
    }
  }

  /**
   * Extract version from filename
   */
  extractVersionFromFilename(filename: string): string {
    const match = filename.match(/(\d{4}-\d{2}-\d{2}_\d{6})/)
    return match ? match[1].replace(/_/g, '.').replace(/-/g, '.') : 'unknown'
  }

  /**
   * Record applied migration in database
   */
  async recordMigration(
    sessionOrTx: Session | ManagedTransaction,
    metadata: MigrationMetadata
  ): Promise<void> {
    await sessionOrTx.run(
      `
      CREATE (m:Migration {
        filename: $filename,
        version: $version,
        checksum: $checksum,
        appliedAt: datetime(),
        appliedBy: $appliedBy,
        executionTime: $executionTime,
        status: $status,
        description: $description
      })
      `,
      {
        filename: metadata.filename,
        version: metadata.version,
        checksum: metadata.checksum,
        appliedBy: metadata.appliedBy || 'system',
        executionTime: metadata.executionTime || 0,
        status: metadata.status,
        description: metadata.description || ''
      }
    )
  }

  /**
   * Apply a single migration
   */
  async applyMigration(
    session: Session,
    filepath: string,
    options: MigrationOptions = {}
  ): Promise<{ success: boolean; executionTime: number; error?: string }> {
    const filename = filepath
    const content = readFileSync(filepath, 'utf-8')
    const checksum = this.calculateChecksum(content)
    const metadata = this.parseMigrationMetadata(content, filename)

    const startTime = Date.now()

    try {
      if (options.dryRun) {
        if (options.verbose) {
          console.log(`[DRY RUN] Would apply: ${filename}`)
          console.log(content)
        }
        return { success: true, executionTime: 0 }
      }

      // Validate migration hasn't been modified
      await this.validateMigration(session, filename, content)

      // Remove multi-line comments and split by semicolon
      const cleanedContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*/g, '') // Remove // comments
      
      const statements = cleanedContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      // Execute each statement in its own transaction
      // This is required for schema modifications (CREATE CONSTRAINT, CREATE INDEX)
      // which cannot be mixed with data writes in the same transaction
      for (const statement of statements) {
        const tx = session.beginTransaction()
        try {
          await tx.run(statement)
          await tx.commit()
        } catch (error) {
          await tx.rollback()
          throw error
        }
      }

      const executionTime = Date.now() - startTime

      // Record migration in a separate transaction
      const recordTx = session.beginTransaction()
      try {
        await this.recordMigration(recordTx, {
          filename,
          version: metadata.version || 'unknown',
          checksum,
          appliedBy: metadata.appliedBy,
          executionTime,
          status: 'SUCCESS',
          description: metadata.description,
          dependencies: metadata.dependencies
        })
        await recordTx.commit()
      } catch (error) {
        await recordTx.rollback()
        throw error
      }

      if (options.verbose) {
        console.log(`✅ Applied migration: ${filename} (${executionTime}ms)`)
      }

      return { success: true, executionTime }
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Record failed migration
      await this.recordMigration(session, {
        filename,
        version: metadata.version || 'unknown',
        checksum,
        executionTime,
        status: 'FAILED',
        description: `FAILED: ${errorMessage}`
      })

      if (options.verbose) {
        console.error(`❌ Failed migration: ${filename}`)
        console.error(errorMessage)
      }

      return { success: false, executionTime, error: errorMessage }
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(options: MigrationOptions = {}): Promise<MigrationResult> {
    const session = this.driver.session()
    const result: MigrationResult = {
      success: true,
      applied: [],
      failed: [],
      skipped: [],
      errors: []
    }

    try {
      const applied = await this.getAppliedMigrations(session)
      const pending = this.getPendingMigrations(applied, options.environment || 'common')

      if (pending.length === 0) {
        if (options.verbose) {
          console.log('✅ No pending migrations')
        }
        return result
      }

      if (options.verbose) {
        console.log(`📋 Found ${pending.length} pending migration(s)`)
      }

      for (const filepath of pending) {
        const migrationResult = await this.applyMigration(session, filepath, options)

        if (migrationResult.success) {
          result.applied.push(filepath)
        } else {
          result.failed.push(filepath)
          result.errors.push({
            file: filepath,
            error: migrationResult.error || 'Unknown error'
          })
          result.success = false

          if (!options.force) {
            break // Stop on first failure unless force is enabled
          }
        }
      }

      return result
    } finally {
      await session.close()
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    applied: MigrationMetadata[]
    pending: string[]
    total: number
  }> {
    const session = this.driver.session()
    try {
      const applied = await this.getAppliedMigrations(session)
      const pending = this.getPendingMigrations(applied)
      return {
        applied,
        pending,
        total: applied.length + pending.length
      }
    } finally {
      await session.close()
    }
  }
}
