#!/usr/bin/env node

import neo4j from 'neo4j-driver'
import { MigrationRunner } from './migrationRunner'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load .env file manually
const envPath = join(process.cwd(), '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
}

const commands = {
  status: 'Show migration status',
  up: 'Apply pending migrations',
  down: 'Rollback last migration',
  create: 'Create a new migration file',
  validate: 'Validate migrations without applying',
  help: 'Show this help message'
}

async function getDriver() {
  const uri = process.env.NEO4J_URI || 'neo4j://neo4j:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'

  return neo4j.driver(uri, neo4j.auth.basic(username, password))
}

async function status() {
  const driver = await getDriver()
  const runner = new MigrationRunner(driver)

  try {
    const status = await runner.getStatus()

    console.log('\n📊 Migration Status\n')
    console.log(`Total migrations: ${status.total}`)
    console.log(`Applied: ${status.applied.length}`)
    console.log(`Pending: ${status.pending.length}`)

    if (status.applied.length > 0) {
      console.log('\n✅ Applied Migrations:')
      status.applied.forEach(m => {
        const time = m.appliedAt ? new Date(m.appliedAt).toISOString() : 'unknown'
        const duration = m.executionTime ? `${m.executionTime}ms` : 'N/A'
        console.log(`  ${m.status === 'SUCCESS' ? '✓' : '✗'} ${m.version} - ${m.filename}`)
        console.log(`    Applied: ${time} (${duration})`)
        if (m.description) {
          console.log(`    ${m.description}`)
        }
      })
    }

    if (status.pending.length > 0) {
      console.log('\n⏳ Pending Migrations:')
      status.pending.forEach(file => {
        console.log(`  • ${file}`)
      })
    } else {
      console.log('\n✅ All migrations are up to date!')
    }

    console.log('')
  } finally {
    await driver.close()
  }
}

async function up(options: { dryRun?: boolean; force?: boolean; verbose?: boolean } = {}) {
  const driver = await getDriver()
  const runner = new MigrationRunner(driver)

  try {
    console.log('\n🚀 Running migrations...\n')

    const result = await runner.runMigrations({
      dryRun: options.dryRun,
      force: options.force,
      verbose: true,
      environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev'
    })

    if (options.dryRun) {
      console.log('\n[DRY RUN] No changes were made to the database')
    }

    if (result.applied.length > 0) {
      console.log(`\n✅ Successfully applied ${result.applied.length} migration(s)`)
    }

    if (result.failed.length > 0) {
      console.log(`\n❌ Failed to apply ${result.failed.length} migration(s)`)
      result.errors.forEach(err => {
        console.error(`  ${err.file}: ${err.error}`)
      })
      process.exit(1)
    }

    if (result.applied.length === 0 && result.failed.length === 0) {
      console.log('\n✅ No pending migrations')
    }

    console.log('')
  } finally {
    await driver.close()
  }
}

async function down() {
  console.log('\n⚠️  Rollback functionality not yet implemented')
  console.log('To rollback manually:')
  console.log('  1. Find the .down.cypher file for the migration')
  console.log('  2. Execute it against the database')
  console.log('  3. Delete the Migration node: MATCH (m:Migration {filename: "..."}) DELETE m')
  console.log('')
  process.exit(1)
}

function create(name: string) {
  if (!name) {
    console.error('❌ Migration name is required')
    console.error('Usage: npm run migrate:create <name>')
    process.exit(1)
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .slice(0, 15)

  const filename = `${timestamp}_${name.replace(/\s+/g, '_')}`
  const upFile = join(process.cwd(), 'src/db/migrations/common', `${filename}.up.cypher`)
  const downFile = join(process.cwd(), 'src/db/migrations/common', `${filename}.down.cypher`)

  const version = timestamp.slice(0, 8) + '.' + timestamp.slice(9, 15)

  const upTemplate = `/*
 * Migration: ${name}
 * Version: ${version}
 * Author: @${process.env.USER || 'unknown'}
 * Ticket: PROJ-XXX
 * 
 * Description:
 * [Describe what this migration does and why]
 *
 * Dependencies:
 * - [List any migrations this depends on, or remove this section]
 *
 * Rollback: See ${filename}.down.cypher
 */

// Your Cypher statements here
// Example:
// CREATE CONSTRAINT example_constraint IF NOT EXISTS
// FOR (n:Example)
// REQUIRE n.id IS UNIQUE;
`

  const downTemplate = `/*
 * Rollback Migration: ${name}
 * Version: ${version}
 * 
 * This script rolls back the changes made in ${filename}.up.cypher
 */

// Your rollback Cypher statements here
// Example:
// DROP CONSTRAINT example_constraint IF EXISTS;
`

  writeFileSync(upFile, upTemplate)
  writeFileSync(downFile, downTemplate)

  console.log('\n✅ Created migration files:')
  console.log(`  ${upFile}`)
  console.log(`  ${downFile}`)
  console.log('\n📝 Next steps:')
  console.log('  1. Edit the migration files with your changes')
  console.log('  2. Test with: npm run migrate:up -- --dry-run')
  console.log('  3. Apply with: npm run migrate:up')
  console.log('')
}

async function validate() {
  const driver = await getDriver()
  const runner = new MigrationRunner(driver)

  try {
    console.log('\n🔍 Validating migrations...\n')

    const result = await runner.runMigrations({
      dryRun: true,
      verbose: true
    })

    if (result.success) {
      console.log('\n✅ All migrations are valid')
    } else {
      console.log('\n❌ Validation failed')
      result.errors.forEach(err => {
        console.error(`  ${err.file}: ${err.error}`)
      })
      process.exit(1)
    }

    console.log('')
  } finally {
    await driver.close()
  }
}

function help() {
  console.log('\n📚 Migration CLI\n')
  console.log('Usage: npm run migrate:<command> [options]\n')
  console.log('Commands:')
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(12)} ${desc}`)
  })
  console.log('\nOptions:')
  console.log('  --dry-run    Preview changes without applying')
  console.log('  --force      Continue on errors')
  console.log('  --verbose    Show detailed output')
  console.log('\nExamples:')
  console.log('  npm run migrate:status')
  console.log('  npm run migrate:create add_user_nodes')
  console.log('  npm run migrate:up -- --dry-run')
  console.log('  npm run migrate:up')
  console.log('')
}

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0]
const options = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  verbose: args.includes('--verbose')
}

// Execute command
;(async () => {
  try {
    switch (command) {
      case 'status':
        await status()
        break
      case 'up':
        await up(options)
        break
      case 'down':
        await down()
        break
      case 'create':
        create(args[1])
        break
      case 'validate':
        await validate()
        break
      case 'help':
      default:
        help()
        break
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
})()
