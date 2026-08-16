#!/usr/bin/env node

import neo4j from 'neo4j-driver'
import { readFileSync, existsSync } from 'fs'
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

interface FixtureData {
  teams: Array<{
    name: string
    email: string
    responsibilityArea: string
  }>
}

async function getDriver() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'

  return neo4j.driver(uri, neo4j.auth.basic(username, password))
}

async function clearData(driver: neo4j.Driver) {
  const session = driver.session()
  try {
    console.log('🗑️  Clearing existing fixture data...')

    // Delete all relationships and nodes except Migration nodes
    await session.run(`
      MATCH (n)
      WHERE NOT n:Migration
      DETACH DELETE n
    `)

    console.log('✅ Existing data cleared')
  } finally {
    await session.close()
  }
}

async function seedTeams(driver: neo4j.Driver, teams: FixtureData['teams']) {
  const session = driver.session()
  try {
    console.log('👥 Seeding teams...')

    for (const team of teams) {
      await session.run(
        `
        MERGE (t:Team {name: $name})
        SET t.email = $email,
            t.responsibilityArea = $responsibilityArea
        `,
        team
      )
    }

    console.log(`✅ Seeded ${teams.length} teams`)
  } finally {
    await session.close()
  }
}

async function seed(options: { clear?: boolean } = {}) {
  const driver = await getDriver()

  try {
    // Load fixture data
    const fixturesPath = join(process.cwd(), 'schema/fixtures/tech-catalog.json')
    const fixtureData: FixtureData = JSON.parse(readFileSync(fixturesPath, 'utf-8'))

    console.log('\n🌱 Starting database seeding...\n')

    // Clear existing data if requested
    if (options.clear) {
      await clearData(driver)
      console.log('')
    }

    // Seed nodes
    await seedTeams(driver, fixtureData.teams)

    console.log('\n✅ Database seeding completed successfully!\n')

    // Print summary
    const session = driver.session()
    try {
      const result = await session.run(`
        MATCH (t:Team) RETURN count(t) as teams
      `)

      if (result.records.length > 0) {
        const record = result.records[0]
        console.log('📊 Summary:')
        console.log(`   Teams: ${record.get('teams')}`)
        console.log('')
        console.log('💡 To add systems, repositories, components, and evidence-backed')
        console.log('   Technologies (React, Vue, etc.), run:')
        console.log('   npm run seed:github')
        console.log('')
      }
    } finally {
      await session.close()
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await driver.close()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  clear: args.includes('--clear')
}

// Execute seeding
;(async () => {
  try {
    await seed(options)
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
})()
