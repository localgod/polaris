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
    status: string
    approvedVersionRange: string
    ownerTeam: string
    riskLevel: string
    lastReviewed: string
  }>
  versions: Array<{
    technologyName: string
    version: string
    releaseDate: string
    eolDate: string
    approved: boolean
    cvssScore: number
    notes: string
  }>
  policies: Array<{
    name: string
    description: string
    ruleType: string
    severity: string
  }>
  systems: Array<{
    name: string
    domain: string
    ownerTeam: string
    businessCriticality: string
    environment: string
  }>
  components: Array<{
    name: string
    version: string
    packageManager: string
    license: string
    sourceRepo: string
    importPath: string
    hash: string
  }>
  relationships: {
    technology_versions: Array<{ technology: string; version: string }>
    team_technologies: Array<{ team: string; technology: string }>
    team_systems: Array<{ team: string; system: string }>
    system_components: Array<{ system: string; component: string; version: string; packageManager: string }>
    component_technologies: Array<{ component: string; version: string; packageManager: string; technology: string }>
    policy_technologies: Array<{ policy: string; technology: string }>
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
            t.status = $status,
            t.approvedVersionRange = $approvedVersionRange,
            t.ownerTeam = $ownerTeam,
            t.riskLevel = $riskLevel,
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
            v.cvssScore = $cvssScore,
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

async function seedPolicies(driver: neo4j.Driver, policies: FixtureData['policies']) {
  const session = driver.session()
  try {
    console.log('📋 Seeding policies...')
    
    for (const policy of policies) {
      await session.run(
        `
        MERGE (p:Policy {name: $name})
        SET p.description = $description,
            p.ruleType = $ruleType,
            p.severity = $severity
        `,
        policy
      )
    }
    
    console.log(`✅ Seeded ${policies.length} policies`)
  } finally {
    await session.close()
  }
}

async function seedSystems(driver: neo4j.Driver, systems: FixtureData['systems']) {
  const session = driver.session()
  try {
    console.log('🖥️  Seeding systems...')
    
    for (const system of systems) {
      await session.run(
        `
        MERGE (s:System {name: $name})
        SET s.domain = $domain,
            s.ownerTeam = $ownerTeam,
            s.businessCriticality = $businessCriticality,
            s.environment = $environment
        `,
        system
      )
    }
    
    console.log(`✅ Seeded ${systems.length} systems`)
  } finally {
    await session.close()
  }
}

async function seedComponents(driver: neo4j.Driver, components: FixtureData['components']) {
  const session = driver.session()
  try {
    console.log('📚 Seeding components...')
    
    for (const component of components) {
      await session.run(
        `
        MERGE (c:Component {name: $name, version: $version, packageManager: $packageManager})
        SET c.license = $license,
            c.sourceRepo = $sourceRepo,
            c.importPath = $importPath,
            c.hash = $hash
        `,
        component
      )
    }
    
    console.log(`✅ Seeded ${components.length} components`)
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
    
    // Team -> Technology
    for (const rel of relationships.team_technologies) {
      await session.run(
        `
        MATCH (team:Team {name: $team})
        MATCH (tech:Technology {name: $technology})
        MERGE (team)-[:OWNS]->(tech)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.team_technologies.length} team-technology relationships`)
    
    // Team -> System
    for (const rel of relationships.team_systems) {
      await session.run(
        `
        MATCH (team:Team {name: $team})
        MATCH (sys:System {name: $system})
        MERGE (team)-[:OWNS]->(sys)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.team_systems.length} team-system relationships`)
    
    // System -> Component
    for (const rel of relationships.system_components) {
      await session.run(
        `
        MATCH (sys:System {name: $system})
        MATCH (comp:Component {name: $component, version: $version, packageManager: $packageManager})
        MERGE (sys)-[:USES]->(comp)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.system_components.length} system-component relationships`)
    
    // Component -> Technology
    for (const rel of relationships.component_technologies) {
      await session.run(
        `
        MATCH (comp:Component {name: $component, version: $version, packageManager: $packageManager})
        MATCH (tech:Technology {name: $technology})
        MERGE (comp)-[:IS_VERSION_OF]->(tech)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.component_technologies.length} component-technology relationships`)
    
    // Policy -> Technology
    for (const rel of relationships.policy_technologies) {
      await session.run(
        `
        MATCH (pol:Policy {name: $policy})
        MATCH (tech:Technology {name: $technology})
        MERGE (pol)-[:APPLIES_TO]->(tech)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.policy_technologies.length} policy-technology relationships`)
    
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
    await seedPolicies(driver, fixtureData.policies)
    await seedSystems(driver, fixtureData.systems)
    await seedComponents(driver, fixtureData.components)
    
    console.log('')
    
    // Seed relationships
    await seedRelationships(driver, fixtureData.relationships)
    
    console.log('\n✅ Database seeding completed successfully!\n')
    
    // Print summary
    const session = driver.session()
    try {
      const result = await session.run(`
        MATCH (t:Team) WITH count(t) as teams
        MATCH (tech:Technology) WITH teams, count(tech) as technologies
        MATCH (v:Version) WITH teams, technologies, count(v) as versions
        MATCH (p:Policy) WITH teams, technologies, versions, count(p) as policies
        MATCH (s:System) WITH teams, technologies, versions, policies, count(s) as systems
        MATCH (c:Component) WITH teams, technologies, versions, policies, systems, count(c) as components
        RETURN teams, technologies, versions, policies, systems, components
      `)
      
      if (result.records.length > 0) {
        const record = result.records[0]
        console.log('📊 Summary:')
        console.log(`   Teams: ${record.get('teams')}`)
        console.log(`   Technologies: ${record.get('technologies')}`)
        console.log(`   Versions: ${record.get('versions')}`)
        console.log(`   Policies: ${record.get('policies')}`)
        console.log(`   Systems: ${record.get('systems')}`)
        console.log(`   Components: ${record.get('components')}`)
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
