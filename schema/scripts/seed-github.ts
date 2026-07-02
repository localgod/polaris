#!/usr/bin/env node

/**
 * Seed Database from GitHub Repositories
 * 
 * This script performs a complete database seeding:
 * 1. Seeds governance data (teams, technologies, policies, approvals) from fixtures
 * 2. Imports GitHub repositories through the admin import API
 * 3. Creates fixture-specific technology and ownership relationships
 * 
 * Usage:
 *   npm run seed:github                    # Full seed (fixtures + GitHub repos)
 *   npm run seed:github -- --clear         # Clear database first, then full seed
 *   npm run seed:github -- --repos="org/repo1,org/repo2"  # CLI repos
 * 
 * Requirements:
 *   - SEED_API_TOKEN environment variable (generate via UI or API)
 *   - Nuxt dev server running
 *   - Internet connection
 * 
 * Note: Repository metadata (default branch, description) is fetched from
 * the GitHub API by the import service.
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import neo4j from 'neo4j-driver'
import { randomBytes, createHash } from 'crypto'

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

interface RepositoryConfig {
  url: string
  branch: string
  system: {
    name: string
    domain: string
    ownerTeam: string
    businessCriticality: string
    environment: string
  }
  repository: {
    name: string
    description?: string
    isPublic: boolean
    requiresAuth: boolean
    scmType: string
    defaultBranch?: string
  }
}

interface GitHubReposConfig {
  repositories: RepositoryConfig[]
}

interface SeedOptions {
  clear: boolean
  repos?: string[]
}

const CONFIG_PATH = join(process.cwd(), 'schema', 'fixtures', 'github-repos.json')

/**
 * Return API base URL, preferring 127.0.0.1 over localhost to avoid
 * potential IPv6/hostname resolution issues when contacting the local dev server.
 */
function getApiBaseUrl(): string {
  const raw = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000'
  if (raw.includes('localhost')) {
    const replaced = raw.replace(/localhost/g, '127.0.0.1')
    console.warn(`  ℹ️  Replacing localhost with 127.0.0.1 for API base URL: ${replaced}`)
    return replaced
  }
  return raw
}

/**
 * Get Neo4j driver
 */
function getDriver(): neo4j.Driver {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'
  
  return neo4j.driver(uri, neo4j.auth.basic(username, password))
}

/**
 * Process a single repository
 */
async function processRepository(config: RepositoryConfig, apiToken: string): Promise<void> {
  const repoName = config.url.split('/').pop() || 'unknown'
  
  console.log(`\n📦 Processing: ${config.url}`)
  
  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/admin/import/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        repositoryUrl: config.url,
        systemName: config.system.name,
        domain: config.system.domain,
        ownerTeam: config.system.ownerTeam,
        businessCriticality: config.system.businessCriticality,
        environment: config.system.environment
      })
    })

    const result = await response.json().catch(() => null) as {
      data?: {
        systemName: string
        manifestsFound: number
        componentsAdded: number
        componentsUpdated: number
        relationshipsCreated: number
      }
      message?: string
      statusMessage?: string
    } | null

    if (!response.ok) {
      const message = result?.message || result?.statusMessage || response.statusText
      throw new Error(`Import API returned ${response.status}: ${message}. Is the Nuxt dev server running at ${baseUrl}?`)
    }

    console.log(`  ✅ Imported via GitHub import service`)
    console.log(`     System: ${result?.data?.systemName || config.system.name}`)
    console.log(`     Manifests found: ${result?.data?.manifestsFound ?? 0}`)
    console.log(`     Components added: ${result?.data?.componentsAdded ?? 0}`)
    console.log(`     Components updated: ${result?.data?.componentsUpdated ?? 0}`)
    console.log(`     Relationships created: ${result?.data?.relationshipsCreated ?? 0}`)
    
    console.log(`✅ Successfully processed ${repoName}\n`)
  } catch (error) {
    console.error(`❌ Error processing ${repoName}:`, error instanceof Error ? error.message : error)
    throw error
  }
}

/**
 * Run fixture seeding (teams, infrastructure technologies, policies, approvals)
 */
async function seedFixtures(clear: boolean): Promise<void> {
  console.log('\n📋 Seeding governance data (teams, infrastructure technologies, policies)...\n')
  
  try {
    const clearFlag = clear ? ' -- --clear' : ''
    execSync(`npm run seed${clearFlag}`, {
      stdio: 'inherit'
    })
    console.log('\n✅ Governance data seeded\n')
  } catch (error) {
    throw new Error(`Failed to seed fixtures: ${error instanceof Error ? error.message : error}`, { cause: error })
  }
}

/**
 * Ensure a technical user exists for seeding
 * Returns the user email
 */
async function ensureTechnicalUserExists(): Promise<string> {
  const driver = getDriver()
  const session = driver.session()
  
  try {
    // Check if any technical user exists
    const result = await session.run(
      'MATCH (u:User {provider: "technical"}) RETURN u.id as id, u.email as email LIMIT 1'
    )
    
    let userId: string
    let email: string
    
    if (result.records.length > 0) {
      email = result.records[0].get('email')
      userId = result.records[0].get('id')
      console.log(`✅ Found existing technical user: ${email}\n`)
    } else {
      // No technical user exists, create one
      console.log('📝 No technical user found, creating one...\n')
      
      email = 'seed-bot@polaris.local'
      const name = 'Seed Bot'
      userId = `technical-${randomBytes(16).toString('hex')}`
      const createdAt = new Date().toISOString()
      
      await session.run(
        `
        CREATE (u:User {
          id: $id,
          email: $email,
          name: $name,
          provider: 'technical',
          role: 'superuser',
          avatarUrl: null,
          createdAt: datetime($createdAt),
          lastLogin: null
        })
        RETURN u.email as email
        `,
        {
          id: userId,
          email,
          name,
          createdAt
        }
      )
      
      console.log(`✅ Created technical user: ${email}`)
      console.log(`   Role: superuser`)
      console.log(`   Provider: technical\n`)
    }
    
    // Ensure a valid API token exists for this user
    await ensureApiToken(session, userId)
    
    return email
  } catch (error) {
    throw new Error(`Failed to ensure technical user exists: ${error instanceof Error ? error.message : error}`, { cause: error })
  } finally {
    await session.close()
    await driver.close()
  }
}

/**
 * Ensure a valid API token exists in the database for the given user.
 * If SEED_API_TOKEN is set, verify its hash exists. If not, generate
 * a new token, store it, and update .env.
 */
async function ensureApiToken(session: neo4j.Session, userId: string): Promise<void> {
  const existingToken = process.env.SEED_API_TOKEN

  if (existingToken) {
    // Check if the hash of the current token exists in the database
    const tokenHash = createHash('sha256').update(existingToken, 'utf8').digest('hex')
    const result = await session.run(
      `MATCH (t:ApiToken {tokenHash: $tokenHash, revoked: false})<-[:HAS_API_TOKEN]-(u:User)
       RETURN t.id as id`,
      { tokenHash }
    )

    if (result.records.length > 0) {
      return // Token is valid and exists in the database
    }

    console.log('⚠️  SEED_API_TOKEN not found in database, creating it...\n')
  }

  // Generate a new token or store the existing one
  const plaintextToken = existingToken || randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(plaintextToken, 'utf8').digest('hex')
  const tokenId = randomBytes(16).toString('hex')
  const createdAt = new Date().toISOString()

  await session.run(
    `MATCH (u:User {id: $userId})
     CREATE (t:ApiToken {
       id: $tokenId,
       tokenHash: $tokenHash,
       createdAt: datetime($createdAt),
       expiresAt: null,
       revoked: false,
       createdBy: $userId,
       description: 'Auto-generated seed token'
     })
     CREATE (u)-[:HAS_API_TOKEN]->(t)
     RETURN t.id as id`,
    { userId, tokenId, tokenHash, createdAt }
  )

  // Update .env if we generated a new token or need to persist the current one
  if (!existingToken) {
    const envPath = join(process.cwd(), '.env')
    if (existsSync(envPath)) {
      let envContent = readFileSync(envPath, 'utf-8')
      if (envContent.includes('SEED_API_TOKEN=')) {
        envContent = envContent.replace(/SEED_API_TOKEN=.*/, `SEED_API_TOKEN=${plaintextToken}`)
      } else {
        envContent += `\nSEED_API_TOKEN=${plaintextToken}\n`
      }
      writeFileSync(envPath, envContent)
    }
    process.env.SEED_API_TOKEN = plaintextToken
    console.log(`✅ Generated new API token and saved to .env\n`)
  } else {
    console.log(`✅ Stored existing SEED_API_TOKEN in database\n`)
  }
}

/**
 * Load repository configurations
 * Note: Branch and description will be fetched from GitHub API during processing
 */
function loadConfigurations(options: SeedOptions): RepositoryConfig[] {
  if (options.repos && options.repos.length > 0) {
    // Parse CLI repos (simplified - just URL)
    // Branch will be fetched from GitHub API during processing
    return options.repos.map(repo => {
      const url = repo.startsWith('http') ? repo : `https://github.com/${repo}`
      const name = repo.split('/').pop() || 'unknown'
      
      return {
        url,
        branch: 'main', // Will be overridden by GitHub API
        system: {
          name: name,
          domain: 'Development',
          ownerTeam: 'Platform Team',
          businessCriticality: 'medium',
          environment: 'dev'
        },
        repository: {
          name,
          isPublic: true,
          requiresAuth: false,
          scmType: 'git'
        }
      }
    })
  }
  
  // Load from config file
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Configuration file not found: ${CONFIG_PATH}`)
  }
  
  const configContent = readFileSync(CONFIG_PATH, 'utf-8')
  const config: GitHubReposConfig = JSON.parse(configContent)
  
  return config.repositories
}

/**
 * Create team-system ownership relationships from fixture data
 * These link teams to systems created by GitHub seeding
 */
async function createTeamSystemRelationships(): Promise<void> {
  console.log('\n🔗 Creating team-system relationships...\n')
  
  const fixturesPath = join(process.cwd(), 'schema/fixtures/tech-catalog.json')
  if (!existsSync(fixturesPath)) {
    console.log('  ⚠️  Fixtures file not found, skipping team-system relationships')
    return
  }
  
  const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'))
  const teamSystems = fixtures.github_systems?.team_systems
  
  if (!teamSystems || teamSystems.length === 0) {
    console.log('  ℹ️  No team-system relationships defined in fixtures')
    return
  }
  
  const driver = getDriver()
  const session = driver.session()
  
  try {
    let created = 0
    let skipped = 0
    
    for (const rel of teamSystems) {
      const result = await session.run(
        `
        MATCH (team:Team {name: $team})
        MATCH (sys:System {name: $system})
        MERGE (team)-[o:OWNS]->(sys)
        ON CREATE SET o.createdAt = datetime()
        RETURN team.name as team, sys.name as system, 
               CASE WHEN o.createdAt = datetime() THEN 'created' ELSE 'exists' END as status
        `,
        { team: rel.team, system: rel.system }
      )
      
      if (result.records.length > 0) {
        const status = result.records[0].get('status')
        if (status === 'created') {
          console.log(`  ✅ ${rel.team} -> ${rel.system}`)
          created++
        } else {
          skipped++
        }
      } else {
        console.log(`  ⚠️  Could not link ${rel.team} -> ${rel.system} (team or system not found)`)
      }
    }
    
    console.log(`\n  Created ${created} relationships, ${skipped} already existed`)
  } finally {
    await session.close()
    await driver.close()
  }
}

/**
 * Create technologies from SBOM-discovered components.
 *
 * Reads the component_technologies section from the fixture file and, for each
 * entry where the component actually exists in the database, creates a Technology
 * node linked to all matching components via IS_VERSION_OF. Then applies
 * stewardship, policy, and TIME approval relationships.
 */
async function createTechnologiesFromComponents(apiToken: string): Promise<void> {
  console.log('\n🔧 Creating technologies from discovered components...\n')

  const fixturesPath = join(process.cwd(), 'schema/fixtures/tech-catalog.json')
  if (!existsSync(fixturesPath)) {
    console.log('  ⚠️  Fixtures file not found, skipping')
    return
  }

  const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'))
  const componentTechs = fixtures.component_technologies
  if (!componentTechs || componentTechs.length === 0) {
    console.log('  ℹ️  No component_technologies defined in fixtures')
    return
  }

  const baseUrl = getApiBaseUrl()

  // Step 1: Create technologies via the API. This claims an existing,
  // currently-unlinked Component named ct.componentName -- if no such
  // Component exists (e.g. this repo doesn't actually depend on it), the
  // API 404s and the failure branch below skips it, which is correct: a
  // Technology can never be created without real SBOM evidence.
  for (const ct of componentTechs) {
    try {
      const response = await fetch(`${baseUrl}/api/technologies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          name: ct.technology.name,
          type: ct.technology.type,
          domain: ct.technology.domain,
          vendor: ct.technology.vendor,
          ownerTeam: ct.ownerTeam,
          componentName: ct.componentName
        })
      })

      if (response.ok) {
        console.log(`  ✅ Created technology: ${ct.technology.name} (from component: ${ct.componentName})`)
      } else if (response.status === 409) {
        console.log(`  ℹ️  Technology already exists: ${ct.technology.name}`)
      } else {
        const err = await response.json()
        console.warn(`  ⚠️  Failed to create ${ct.technology.name}: ${err.message || response.status}`)
        continue
      }
    } catch (error) {
      console.warn(`  ⚠️  Error creating ${ct.technology.name}: ${error instanceof Error ? error.message : error}`)
      continue
    }
  }

  // Step 2: Apply stewardship, policies, and approvals via Cypher
  const driver = getDriver()
  const session = driver.session()

  try {
    // Stewardship relationships
    for (const ct of componentTechs) {
      for (const teamName of ct.stewardTeams || []) {
        await session.run(`
          MATCH (team:Team {name: $team})
          MATCH (tech:Technology {name: $technology})
          MERGE (team)-[:STEWARDED_BY]->(tech)
        `, { team: teamName, technology: ct.technology.name })
      }
    }
    console.log('  ✅ Stewardship relationships created')

    // Policy relationships
    for (const ct of componentTechs) {
      for (const policyName of ct.policies || []) {
        await session.run(`
          MATCH (pol:Policy {name: $policy})
          MATCH (tech:Technology {name: $technology})
          MERGE (pol)-[:GOVERNS]->(tech)
        `, { policy: policyName, technology: ct.technology.name })
      }
    }
    console.log('  ✅ Policy relationships created')

    // TIME approvals
    for (const ct of componentTechs) {
      for (const approval of ct.approvals || []) {
        await session.run(`
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
        `, {
          team: approval.team,
          technology: ct.technology.name,
          time: approval.time,
          approvedAt: approval.approvedAt || null,
          deprecatedAt: approval.deprecatedAt || null,
          eolDate: approval.eolDate || null,
          migrationTarget: approval.migrationTarget || null,
          notes: approval.notes || null,
          approvedBy: approval.approvedBy || null
        })
      }
    }
    console.log('  ✅ TIME approvals created')
  } finally {
    await session.close()
    await driver.close()
  }
}

/**
 * Main seeding function
 */
async function seedFromGitHub(options: SeedOptions): Promise<void> {
  console.log('\n🌟 GitHub SBOM Seeding\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // Seed fixtures first (teams, Platforms for non-SBOM-observable infrastructure)
  // SBOM-discoverable technologies (React, Vue, etc.) are created later from components
  // This must run before ensureTechnicalUserExists because --clear deletes all non-Migration nodes
  await seedFixtures(options.clear)
  
  // Ensure a technical user and API token exist (after fixtures, which may clear the DB)
  const userEmail = await ensureTechnicalUserExists()
  
  // Check for API token
  const apiToken = process.env.SEED_API_TOKEN
  if (!apiToken) {
    console.log('⚠️  SEED_API_TOKEN not found in environment\n')
    console.log(`Please generate an API token for ${userEmail} via the UI (/users)`)
    console.log('or API (POST /api/admin/users/<userId>/tokens), then add to .env:')
    console.log('  SEED_API_TOKEN=your-token-here\n')
    process.exit(1)
  }
  
  try {
    // Load configurations
    const repositories = loadConfigurations(options)
    console.log(`📋 Found ${repositories.length} repositories to process\n`)
    
    // Process each repository
    let successCount = 0
    let failureCount = 0
    
    for (const config of repositories) {
      try {
        await processRepository(config, apiToken)
        successCount++
      } catch {
        failureCount++
        console.error(`\n❌ Failed to process ${config.url}\n`)
      }
    }
    
    // Create technologies from discovered components
    // This uses component_technologies from fixtures to create Technology nodes
    // linked to SBOM-discovered components, then applies governance data
    await createTechnologiesFromComponents(apiToken)
    
    // Create team-system relationships from fixtures
    // This links teams to the systems we just created from GitHub
    await createTeamSystemRelationships()
    
    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Summary:')
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${failureCount}`)
    console.log(`   📦 Total: ${repositories.length}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    if (failureCount > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options: SeedOptions = {
  clear: args.includes('--clear'),
  repos: args.find(arg => arg.startsWith('--repos='))?.split('=')[1]?.split(',')
}

// Execute seeding
seedFromGitHub(options)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
