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
    effectiveDate?: string
    expiryDate?: string
    enforcedBy?: string
    scope?: string
    status?: string
  }>
  systems: Array<{
    name: string
    domain: string
    ownerTeam: string
    businessCriticality: string
    environment: string
    sourceCodeType?: string
    hasSourceAccess?: boolean
  }>
  repositories: Array<{
    url: string
    scmType: string
    name: string
    description?: string
    isPublic: boolean
    requiresAuth: boolean
    defaultBranch?: string
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
    system_repositories: Array<{ system: string; repository: string }>
    team_repositories: Array<{ team: string; repository: string }>
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
      versionConstraint?: string
    }>
    team_version_approvals: Array<{
      team: string
      technology: string
      version: string
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
            p.severity = $severity,
            p.effectiveDate = COALESCE(date($effectiveDate), date()),
            p.expiryDate = CASE WHEN $expiryDate IS NOT NULL THEN date($expiryDate) ELSE null END,
            p.enforcedBy = COALESCE($enforcedBy, 'Security'),
            p.scope = COALESCE($scope, 'organization'),
            p.status = COALESCE($status, 'active')
        `,
        {
          name: policy.name,
          description: policy.description,
          ruleType: policy.ruleType,
          severity: policy.severity,
          effectiveDate: policy.effectiveDate || null,
          expiryDate: policy.expiryDate || null,
          enforcedBy: policy.enforcedBy || null,
          scope: policy.scope || null,
          status: policy.status || null
        }
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
        MERGE (team:Team {name: $ownerTeam})
        MERGE (s:System {name: $name})
        SET s.domain = $domain,
            s.businessCriticality = $businessCriticality,
            s.environment = $environment,
            s.sourceCodeType = $sourceCodeType,
            s.hasSourceAccess = $hasSourceAccess
        MERGE (team)-[:OWNS]->(s)
        `,
        {
          name: system.name,
          domain: system.domain,
          ownerTeam: system.ownerTeam,
          businessCriticality: system.businessCriticality,
          environment: system.environment,
          sourceCodeType: system.sourceCodeType || 'unknown',
          hasSourceAccess: system.hasSourceAccess !== undefined ? system.hasSourceAccess : false
        }
      )
    }
    
    console.log(`✅ Seeded ${systems.length} systems`)
  } finally {
    await session.close()
  }
}

async function seedRepositories(driver: neo4j.Driver, repositories: FixtureData['repositories']) {
  const session = driver.session()
  try {
    console.log('📦 Seeding repositories...')
    
    for (const repo of repositories) {
      await session.run(
        `
        MERGE (r:Repository {url: $url})
        SET r.scmType = $scmType,
            r.name = $name,
            r.description = $description,
            r.isPublic = $isPublic,
            r.requiresAuth = $requiresAuth,
            r.defaultBranch = $defaultBranch,
            r.createdAt = COALESCE(r.createdAt, datetime()),
            r.lastSyncedAt = datetime()
        `,
        {
          url: repo.url,
          scmType: repo.scmType,
          name: repo.name,
          description: repo.description || null,
          isPublic: repo.isPublic,
          requiresAuth: repo.requiresAuth,
          defaultBranch: repo.defaultBranch || null
        }
      )
    }
    
    console.log(`✅ Seeded ${repositories.length} repositories`)
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
        MERGE (team)-[:STEWARDED_BY]->(tech)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.team_technologies.length} team stewardship relationships`)
    
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
    
    // Policy -> Technology (using GOVERNS relationship)
    for (const rel of relationships.policy_technologies) {
      await session.run(
        `
        MATCH (pol:Policy {name: $policy})
        MATCH (tech:Technology {name: $technology})
        MERGE (pol)-[:GOVERNS]->(tech)
        `,
        rel
      )
    }
    console.log(`✅ Created ${relationships.policy_technologies.length} policy-technology relationships`)
    
    // System -> Repository
    for (const rel of relationships.system_repositories) {
      await session.run(
        `
        MATCH (sys:System {name: $system})
        MATCH (repo:Repository {url: $repository})
        MERGE (sys)-[r:HAS_SOURCE_IN]->(repo)
        SET r.addedAt = COALESCE(r.addedAt, datetime())
        `,
        {
          system: rel.system,
          repository: rel.repository
        }
      )
    }
    console.log(`✅ Created ${relationships.system_repositories.length} system-repository relationships`)
    
    // Team -> Repository
    for (const rel of relationships.team_repositories) {
      await session.run(
        `
        MATCH (team:Team {name: $team})
        MATCH (repo:Repository {url: $repository})
        MERGE (team)-[r:MAINTAINS]->(repo)
        SET r.since = COALESCE(r.since, datetime())
        `,
        {
          team: rel.team,
          repository: rel.repository
        }
      )
    }
    console.log(`✅ Created ${relationships.team_repositories.length} team-repository relationships`)
    
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
            a.approvedBy = $approvedBy,
            a.versionConstraint = $versionConstraint
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
          approvedBy: approval.approvedBy || null,
          versionConstraint: approval.versionConstraint || null
        }
      )
    }
    console.log(`✅ Created ${approvals.team_technology_approvals.length} team-technology approvals`)
    
    // Team -> Version approvals
    for (const approval of approvals.team_version_approvals) {
      await session.run(
        `
        MATCH (team:Team {name: $team})
        MATCH (tech:Technology {name: $technology})
        MATCH (tech)-[:HAS_VERSION]->(v:Version {version: $version})
        MERGE (team)-[a:APPROVES]->(v)
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
          version: approval.version,
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
    console.log(`✅ Created ${approvals.team_version_approvals.length} team-version approvals`)
    
  } finally {
    await session.close()
  }
}

async function createUsesRelationships(driver: neo4j.Driver) {
  const session = driver.session()
  
  try {
    console.log('Creating USES relationships...')
    
    // Create USES relationships based on system ownership
    // This infers actual usage from the system dependency graph
    const result = await session.run(`
      MATCH (team:Team)-[:OWNS]->(sys:System)
      MATCH (sys)-[:USES]->(comp:Component)
      MATCH (comp)-[:IS_VERSION_OF]->(tech:Technology)
      WITH team, tech, 
           count(DISTINCT sys) as systemCount
      MERGE (team)-[u:USES]->(tech)
      ON CREATE SET
        u.firstUsed = datetime(),
        u.lastVerified = datetime(),
        u.systemCount = systemCount
      ON MATCH SET
        u.lastVerified = datetime(),
        u.systemCount = systemCount
      RETURN count(u) as usesCount
    `)
    
    const usesCount = result.records[0]?.get('usesCount').toNumber() || 0
    console.log(`✅ Created ${usesCount} USES relationships`)
    
  } finally {
    await session.close()
  }
}

async function createPolicyRelationships(driver: neo4j.Driver) {
  const session = driver.session()
  
  try {
    console.log('Creating policy enforcement relationships...')
    
    // Create ENFORCES relationships based on enforcedBy property
    const enforcesResult = await session.run(`
      MATCH (p:Policy)
      WHERE p.enforcedBy IS NOT NULL
      MATCH (team:Team {name: p.enforcedBy})
      MERGE (team)-[:ENFORCES]->(p)
      RETURN count(*) as enforcesCount
    `)
    
    const enforcesCount = enforcesResult.records[0]?.get('enforcesCount').toNumber() || 0
    console.log(`✅ Created ${enforcesCount} ENFORCES relationships`)
    
    // Create SUBJECT_TO relationships for organization-wide policies
    const subjectToResult = await session.run(`
      MATCH (p:Policy {scope: 'organization'})
      MATCH (team:Team)
      MERGE (team)-[:SUBJECT_TO]->(p)
      RETURN count(*) as subjectToCount
    `)
    
    const subjectToCount = subjectToResult.records[0]?.get('subjectToCount').toNumber() || 0
    console.log(`✅ Created ${subjectToCount} SUBJECT_TO relationships`)
    
  } finally {
    await session.close()
  }
}

async function createViolationScenarios(driver: neo4j.Driver) {
  const session = driver.session()
  
  try {
    console.log('Creating policy violation scenarios...')
    
    // Scenario 1: Frontend Platform uses jQuery (deprecated) without approval
    await session.run(`
      MATCH (team:Team {name: 'Frontend Platform'})
      MATCH (tech:Technology {name: 'jQuery'})
      MERGE (team)-[u:USES]->(tech)
      ON CREATE SET u.firstUsed = datetime(),
                    u.lastVerified = datetime(),
                    u.systemCount = 2
    `)
    console.log('✅ Frontend Platform uses jQuery (deprecated, not approved)')
    
    // Scenario 2: Backend Platform uses Lodash (deprecated) without approval
    await session.run(`
      MATCH (team:Team {name: 'Backend Platform'})
      MATCH (tech:Technology {name: 'Lodash'})
      MERGE (team)-[u:USES]->(tech)
      ON CREATE SET u.firstUsed = datetime(),
                    u.lastVerified = datetime(),
                    u.systemCount = 3
    `)
    console.log('✅ Backend Platform uses Lodash (deprecated, not approved)')
    
    // Scenario 3: Data Platform uses MySQL (experimental) without approval
    await session.run(`
      MATCH (team:Team {name: 'Data Platform'})
      MATCH (tech:Technology {name: 'MySQL'})
      MERGE (team)-[u:USES]->(tech)
      ON CREATE SET u.firstUsed = datetime(),
                    u.lastVerified = datetime(),
                    u.systemCount = 1
    `)
    console.log('✅ Data Platform uses MySQL (experimental, not approved)')
    
    // Count violations
    const violationsResult = await session.run(`
      MATCH (team:Team)-[:USES]->(tech:Technology)
      WHERE NOT (team)-[:APPROVES]->(tech)
      MATCH (policy:Policy {status: 'active'})-[:GOVERNS]->(tech)
      MATCH (team)-[:SUBJECT_TO]->(policy)
      RETURN count(*) as violationCount
    `)
    
    const violationCount = violationsResult.records[0]?.get('violationCount').toNumber() || 0
    console.log(`✅ Created ${violationCount} policy violations`)
    
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
    await seedRepositories(driver, fixtureData.repositories)
    await seedComponents(driver, fixtureData.components)
    
    console.log('')
    
    // Seed relationships
    await seedRelationships(driver, fixtureData.relationships)
    
    console.log('')
    
    // Seed approvals
    await seedApprovals(driver, fixtureData.approvals)
    
    console.log('')
    
    // Create USES relationships (inferred from system ownership)
    await createUsesRelationships(driver)
    
    console.log('')
    
    // Create policy enforcement relationships
    await createPolicyRelationships(driver)
    
    console.log('')
    
    // Create violation scenarios
    await createViolationScenarios(driver)
    
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
        MATCH (r:Repository) WITH teams, technologies, versions, policies, systems, count(r) as repositories
        MATCH (c:Component) WITH teams, technologies, versions, policies, systems, repositories, count(c) as components
        RETURN teams, technologies, versions, policies, systems, repositories, components
      `)
      
      if (result.records.length > 0) {
        const record = result.records[0]
        console.log('📊 Summary:')
        console.log(`   Teams: ${record.get('teams')}`)
        console.log(`   Technologies: ${record.get('technologies')}`)
        console.log(`   Versions: ${record.get('versions')}`)
        console.log(`   Policies: ${record.get('policies')}`)
        console.log(`   Systems: ${record.get('systems')}`)
        console.log(`   Repositories: ${record.get('repositories')}`)
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
