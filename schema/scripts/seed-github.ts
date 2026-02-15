#!/usr/bin/env node

/**
 * Seed Database from GitHub Repositories
 * 
 * This script performs a complete database seeding:
 * 1. Seeds governance data (teams, technologies, policies, approvals) from fixtures
 * 2. Clones GitHub repositories and generates SBOMs using cdxgen
 * 3. Posts SBOMs to the /api/sboms endpoint to populate systems and components
 * 
 * Usage:
 *   npm run seed:github                    # Full seed (fixtures + GitHub repos)
 *   npm run seed:github -- --clear         # Clear database first, then full seed
 *   npm run seed:github -- --repos="org/repo1,org/repo2"  # CLI repos
 * 
 * Requirements:
 *   - SEED_API_TOKEN environment variable (create with seed-api-token.ts)
 *   - Git installed
 *   - Internet connection
 * 
 * Note: Repository metadata (default branch, description) is fetched from
 * the GitHub API automatically, overriding values in github-repos.json.
 */

import { execSync } from 'child_process'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { createBom } from '@cyclonedx/cdxgen'
import neo4j from 'neo4j-driver'
import { randomBytes } from 'crypto'

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
    sourceCodeType?: string
    hasSourceAccess?: boolean
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

const TEMP_DIR = join(process.cwd(), '.data', 'temp')
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
 * GitHub repository metadata from API
 */
interface GitHubRepoMetadata {
  default_branch: string
  description: string | null
  language: string | null
  name: string
  full_name: string
  private: boolean
}

/**
 * Fetch repository metadata from GitHub API
 */
async function fetchGitHubMetadata(repoUrl: string): Promise<GitHubRepoMetadata | null> {
  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) {
    console.warn(`  ⚠️  Could not parse GitHub URL: ${repoUrl}`)
    return null
  }
  
  const [, owner, repo] = match
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Polaris-Seeder'
      }
    })
    
    if (!response.ok) {
      console.warn(`  ⚠️  GitHub API returned ${response.status} for ${owner}/${repo}`)
      return null
    }
    
    const data = await response.json() as GitHubRepoMetadata
    return data
  } catch (error) {
    console.warn(`  ⚠️  Failed to fetch GitHub metadata: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

/**
 * Enrich repository config with GitHub metadata
 */
async function enrichWithGitHubMetadata(config: RepositoryConfig): Promise<RepositoryConfig> {
  console.log(`  🔍 Fetching metadata from GitHub API...`)
  
  const metadata = await fetchGitHubMetadata(config.url)
  
  if (!metadata) {
    console.log(`  ℹ️  Using config file values (GitHub API unavailable)`)
    return config
  }
  
  // Update config with GitHub metadata
  const enriched: RepositoryConfig = {
    ...config,
    branch: metadata.default_branch,
    repository: {
      ...config.repository,
      name: metadata.name,
      description: metadata.description || config.repository.description,
      isPublic: !metadata.private,
      defaultBranch: metadata.default_branch
    }
  }
  
  console.log(`  ✅ Got metadata: branch=${metadata.default_branch}, description="${metadata.description || '(none)'}"`)
  
  return enriched
}

/**
 * Clone a GitHub repository to a temporary directory
 */
async function cloneRepository(repoUrl: string, branch: string, targetDir: string): Promise<void> {
  console.log(`  📥 Cloning ${repoUrl} (branch: ${branch})...`)
  
  try {
    execSync(`git clone --depth 1 --branch ${branch} ${repoUrl} ${targetDir}`, {
      stdio: 'pipe'
    })
    console.log(`  ✅ Cloned successfully`)
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Generate SBOM using cdxgen
 */
async function generateSBOM(repoPath: string, repoName: string): Promise<object> {
  console.log(`  🔨 Generating SBOM for ${repoName}...`)
  
  try {
    const bom = await createBom(repoPath, {
      installDeps: false,
      projectName: repoName,
      projectVersion: '1.0.0',
      multiProject: true  // Detect multiple package managers (npm, composer, etc.)
    })
    
    if (!bom) {
      throw new Error('cdxgen returned empty BOM')
    }
    
    console.log(`  ✅ SBOM generated successfully`)
    
    // cdxgen can return either string or object
    if (typeof bom === 'string') {
      return JSON.parse(bom)
    } else if (bom && typeof bom === 'object' && 'bomJson' in bom) {
      // Newer versions return an object with bomJson property
      return (bom as Record<string, unknown>).bomJson as object
    } else {
      // It's already a BOM object
      return bom as object
    }
  } catch (error) {
    throw new Error(`Failed to generate SBOM: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Get Neo4j driver
 */
function getDriver(): neo4j.Driver {
  const uri = process.env.NEO4J_URI || 'neo4j://neo4j:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'
  
  return neo4j.driver(uri, neo4j.auth.basic(username, password))
}

/**
 * Ensure system and repository exist in database
 */
async function ensureSystemExists(config: RepositoryConfig, apiToken: string): Promise<void> {
  console.log(`  🔍 Ensuring system exists: ${config.system.name}`)
  
  const baseUrl = getApiBaseUrl()
  
  // Create system via API (will fail if exists, which is fine)
  try {
    const response = await fetch(`${baseUrl}/api/systems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify(config.system)
    })
    
    if (response.ok) {
      console.log(`  ✅ System created`)
    } else if (response.status === 409) {
      // System already exists - this is fine
      console.log(`  ✅ System already exists`)
    } else {
      const error = await response.text()
      throw new Error(`Failed to create system: ${response.status} ${error}`)
    }
  } catch (error) {
    // If it's a 409 conflict, that's okay
    if (error instanceof Error && error.message.includes('409')) {
      console.log(`  ✅ System already exists`)
    } else {
      const msg = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to create system via API at ${baseUrl}/api/systems: ${msg}. Is the Nuxt dev server running? Start it with 'npm run dev' and ensure ${baseUrl} is reachable.`)
    }
  }
  
  // Create repository directly in Neo4j
  await ensureRepositoryExists(config)
}

/**
 * Ensure repository exists and is linked to system (using Neo4j directly)
 */
async function ensureRepositoryExists(config: RepositoryConfig): Promise<void> {
  const driver = getDriver()
  const session = driver.session()
  
  try {
    // Create repository and link to system in one query
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
      
      WITH r
      MATCH (s:System {name: $systemName})
      MERGE (s)-[:HAS_SOURCE_IN]->(r)
      
      RETURN r.url as url
      `,
      {
        url: config.url,
        scmType: config.repository.scmType,
        name: config.repository.name,
        description: config.repository.description || null,
        isPublic: config.repository.isPublic,
        requiresAuth: config.repository.requiresAuth,
        defaultBranch: config.repository.defaultBranch || null,
        systemName: config.system.name
      }
    )
    
    console.log(`  ✅ Repository created and linked to system`)
  } catch (error) {
    throw new Error(`Failed to create repository: ${error instanceof Error ? error.message : error}`)
  } finally {
    await session.close()
    await driver.close()
  }
}

/**
 * Sanitize SBOM by converting Maps and Sets to plain objects/arrays
 * Neo4j doesn't support Map or Set objects
 */
function sanitizeSBOM(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  // Convert Map to plain object
  if (obj instanceof Map) {
    const plain: Record<string, unknown> = {}
    obj.forEach((value, key) => {
      plain[String(key)] = sanitizeSBOM(value)
    })
    return plain
  }
  
  // Convert Set to array
  if (obj instanceof Set) {
    return Array.from(obj).map(item => sanitizeSBOM(item))
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeSBOM(item))
  }
  
  // Handle plain objects
  if (typeof obj === 'object' && obj.constructor === Object) {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeSBOM(value)
    }
    return sanitized
  }
  
  // Return primitives and other types as-is
  return obj
}

/**
 * Post SBOM to the API endpoint
 */
async function postSBOM(repoUrl: string, sbom: object, apiToken: string): Promise<void> {
  console.log(`  📤 Posting SBOM to API...`)
  
  const baseUrl = getApiBaseUrl()
  
  // Sanitize SBOM to remove Map/Set objects
  const sanitized = sanitizeSBOM(sbom)
  
  try {
    const response = await fetch(`${baseUrl}/api/sboms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        repositoryUrl: repoUrl,
        sbom: sanitized
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API returned ${response.status}: ${JSON.stringify(error)}`)
    }
    
    const result = await response.json()
    console.log(`  ✅ SBOM processed successfully`)
    console.log(`     System: ${result.systemName}`)
    console.log(`     Components added: ${result.componentsAdded}`)
    console.log(`     Components updated: ${result.componentsUpdated}`)
    console.log(`     Relationships created: ${result.relationshipsCreated}`)
  } catch (error) {
    throw new Error(`Failed to post SBOM: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Process a single repository
 */
async function processRepository(config: RepositoryConfig, apiToken: string): Promise<void> {
  const repoName = config.url.split('/').pop() || 'unknown'
  const repoDir = join(TEMP_DIR, repoName)
  
  console.log(`\n📦 Processing: ${config.url}`)
  
  try {
    // Enrich config with GitHub metadata (default branch, description, etc.)
    const enrichedConfig = await enrichWithGitHubMetadata(config)
    
    // Clean up any existing directory first
    if (existsSync(repoDir)) {
      console.log(`  🧹 Cleaning up existing directory...`)
      rmSync(repoDir, { recursive: true, force: true })
    }
    
    // Clone repository using the correct branch from GitHub
    await cloneRepository(enrichedConfig.url, enrichedConfig.branch, repoDir)
    
    // Generate SBOM
    const sbom = await generateSBOM(repoDir, repoName)
    
    // Ensure system exists
    await ensureSystemExists(enrichedConfig, apiToken)
    
    // Post SBOM
    await postSBOM(enrichedConfig.url, sbom, apiToken)
    
    console.log(`✅ Successfully processed ${repoName}\n`)
  } catch (error) {
    console.error(`❌ Error processing ${repoName}:`, error instanceof Error ? error.message : error)
    throw error
  } finally {
    // Cleanup cloned repository
    if (existsSync(repoDir)) {
      rmSync(repoDir, { recursive: true, force: true })
    }
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
    throw new Error(`Failed to seed fixtures: ${error instanceof Error ? error.message : error}`)
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
      'MATCH (u:User {provider: "technical"}) RETURN u.email as email LIMIT 1'
    )
    
    if (result.records.length > 0) {
      const email = result.records[0].get('email')
      console.log(`✅ Found existing technical user: ${email}\n`)
      return email
    }
    
    // No technical user exists, create one
    console.log('📝 No technical user found, creating one...\n')
    
    const email = 'seed-bot@polaris.local'
    const name = 'Seed Bot'
    const userId = `technical-${randomBytes(16).toString('hex')}`
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
    
    return email
  } catch (error) {
    throw new Error(`Failed to ensure technical user exists: ${error instanceof Error ? error.message : error}`)
  } finally {
    await session.close()
    await driver.close()
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
  
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'
  
  const neo4jModule = await import('neo4j-driver')
  const driver = neo4jModule.default.driver(uri, neo4jModule.default.auth.basic(username, password))
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

  // Step 1: Create technologies via the API (links components automatically)
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
          category: ct.technology.category,
          vendor: ct.technology.vendor,
          ownerTeam: ct.ownerTeam,
          componentName: ct.componentName,
          componentPackageManager: ct.packageManager
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
              a.approvedBy = $approvedBy,
              a.versionConstraint = $versionConstraint
        `, {
          team: approval.team,
          technology: ct.technology.name,
          time: approval.time,
          approvedAt: approval.approvedAt || null,
          deprecatedAt: approval.deprecatedAt || null,
          eolDate: approval.eolDate || null,
          migrationTarget: approval.migrationTarget || null,
          notes: approval.notes || null,
          approvedBy: approval.approvedBy || null,
          versionConstraint: approval.versionConstraint || null
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
  
  // Ensure a technical user exists
  const userEmail = await ensureTechnicalUserExists()
  
  // Check for API token
  const apiToken = process.env.SEED_API_TOKEN
  if (!apiToken) {
    console.log('⚠️  SEED_API_TOKEN not found in environment\n')
    console.log('Please create an API token for the technical user:')
    console.log(`  npx tsx schema/scripts/seed-api-token.ts ${userEmail}`)
    console.log('  Then add it to .env: SEED_API_TOKEN=your-token-here\n')
    process.exit(1)
  }
  
  // Seed fixtures first (teams, infrastructure technologies, policies, approvals)
  // SBOM-discoverable technologies (React, Vue, etc.) are created later from components
  await seedFixtures(options.clear)
  
  // Create temp directory
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true })
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
  } finally {
    // Cleanup temp directory
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true })
    }
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
