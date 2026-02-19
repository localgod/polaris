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
  technologies: Array<{
    name: string
    category: string
    vendor: string
    lastReviewed: string
  }>
  versions: Array<{
    technologyName: string
    version: string
    releaseDate: string
    eolDate: string
    approved: boolean
    notes: string
  }>
  relationships: {
    technology_versions: Array<{ technology: string; version: string }>
    team_technologies: Array<{ team: string; technology: string }>
  }
  approvals: {
    team_technology_approvals: Array<{
      team: string
      technology: string
      time: string
      approvedAt?: string
      deprecatedAt?: string
      eolDate?: string
      migrationTarget?: string
      notes?: string
      approvedBy?: string
    }>
  }
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

async function seedTechnologies(driver: neo4j.Driver, technologies: FixtureData['technologies']) {
  const session = driver.session()
  try {
    console.log('🔧 Seeding technologies...')
    
    for (const tech of technologies) {
      await session.run(
        `
        MERGE (t:Technology {name: $name})
        SET t.category = $category,
            t.vendor = $vendor,
            t.lastReviewed = date($lastReviewed)
        `,
        tech
      )
    }
    
    console.log(`✅ Seeded ${technologies.length} technologies`)
  } finally {
    await session.close()
  }
}

async function seedVersions(driver: neo4j.Driver, versions: FixtureData['versions']) {
  const session = driver.session()
  try {
    console.log('📦 Seeding versions...')
    
    for (const version of versions) {
      await session.run(
        `
        MERGE (v:Version {technologyName: $technologyName, version: $version})
        SET v.releaseDate = date($releaseDate),
            v.eolDate = date($eolDate),
            v.approved = $approved,
            v.notes = $notes
        `,
        version
      )
    }
    
    console.log(`✅ Seeded ${versions.length} versions`)
  } finally {
    await session.close()
  }
}

async function seedRelationships(driver: neo4j.Driver, relationships: FixtureData['relationships']) {
  const session = driver.session()
  try {
    console.log('🔗 Creating relationships...')
    
    // Technology -> Version
    for (const rel of relationships.technology_versions) {
      await session.run(
        `
        MATCH (t:Technology {name: $technology})
        MATCH (v:Version {technologyName: $technology, version: $version})
        MERGE (t)-[:HAS_VERSION]->(v)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.technology_versions.length} technology-version relationships`)
    
    // Team -> Technology (stewardship)
    for (const rel of relationships.team_technologies) {
      await session.run(
        `
        MATCH (team:Team {name: $team})
        MATCH (tech:Technology {name: $technology})
        MERGE (team)-[:STEWARDED_BY]->(tech)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.team_technologies.length} team stewardship relationships`)
    
  } finally {
    await session.close()
  }
}

async function seedApprovals(driver: neo4j.Driver, approvals: FixtureData['approvals']) {
  const session = driver.session()
  try {
    console.log('✅ Seeding team approvals...')
    
    // Team -> Technology approvals
    for (const approval of approvals.team_technology_approvals) {
      await session.run(
        `
        MATCH (team:Team {name: $team})
        MATCH (tech:Technology {name: $technology})
        MERGE (team)-[a:APPROVES]->(tech)
        SET a.time = $time,
            a.approvedAt = CASE WHEN $approvedAt IS NOT NULL THEN datetime($approvedAt) ELSE datetime() END,
            a.deprecatedAt = CASE WHEN $deprecatedAt IS NOT NULL THEN datetime($deprecatedAt) ELSE null END,
            a.eolDate = CASE WHEN $eolDate IS NOT NULL THEN date($eolDate) ELSE null END,
            a.migrationTarget = $migrationTarget,
            a.notes = $notes,
            a.approvedBy = $approvedBy
        `,
        {
          team: approval.team,
          technology: approval.technology,
          time: approval.time,
          approvedAt: approval.approvedAt || null,
          deprecatedAt: approval.deprecatedAt || null,
          eolDate: approval.eolDate || null,
          migrationTarget: approval.migrationTarget || null,
          notes: approval.notes || null,
          approvedBy: approval.approvedBy || null
        }
      )
    }
    console.log(`✅ Created ${approvals.team_technology_approvals.length} team-technology approvals`)
    
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
    await seedTechnologies(driver, fixtureData.technologies)
    await seedVersions(driver, fixtureData.versions)
    // Seed relationships
    await seedRelationships(driver, fixtureData.relationships)
    
    console.log('')
    
    // Seed approvals
    await seedApprovals(driver, fixtureData.approvals)
    
    console.log('\n✅ Database seeding completed successfully!\n')
    
    // Print summary
    const session = driver.session()
    try {
      const result = await session.run(`
        MATCH (t:Team) WITH count(t) as teams
        MATCH (tech:Technology) WITH teams, count(tech) as technologies
        MATCH (v:Version) WITH teams, technologies, count(v) as versions
        RETURN teams, technologies, versions
      `)
      
      if (result.records.length > 0) {
        const record = result.records[0]
        console.log('📊 Summary:')
        console.log(`   Teams: ${record.get('teams')}`)
        console.log(`   Technologies: ${record.get('technologies')}`)
        console.log(`   Versions: ${record.get('versions')}`)
        console.log('')
        console.log('💡 To add systems, repositories, and components, run:')
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
