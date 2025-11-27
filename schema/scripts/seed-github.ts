#!/usr/bin/env node

/**
 * Seed Database from GitHub Repositories
 * 
 * This script clones GitHub repositories, generates SBOMs using cdxgen,
 * and posts them to the /api/sboms endpoint to populate the database.
 * 
 * Usage:
 *   npm run seed:github                    # Use github-repos.json config
 *   npm run seed:github -- --clear         # Clear database first
 *   npm run seed:github -- --repos="org/repo1,org/repo2"  # CLI repos
 * 
 * Requirements:
 *   - SEED_API_TOKEN environment variable (create with seed-api-token.ts)
 *   - Git installed
 *   - Internet connection
 */

import { execSync } from 'child_process'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { createBom } from '@cyclonedx/cdxgen'
import neo4j from 'neo4j-driver'

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
      projectVersion: '1.0.0'
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
  
  const baseUrl = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
  
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
      throw new Error(`Failed to ensure system exists: ${error instanceof Error ? error.message : error}`)
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
  
  const baseUrl = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
  
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
    // Clone repository
    await cloneRepository(config.url, config.branch, repoDir)
    
    // Generate SBOM
    const sbom = await generateSBOM(repoDir, repoName)
    
    // Ensure system exists
    await ensureSystemExists(config, apiToken)
    
    // Post SBOM
    await postSBOM(config.url, sbom, apiToken)
    
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
 * Clear database if requested
 */
async function clearDatabase(): Promise<void> {
  console.log('\n🗑️  Clearing database...\n')
  
  try {
    execSync('npm run seed -- --clear', {
      stdio: 'inherit'
    })
    console.log('\n✅ Database cleared\n')
  } catch (error) {
    throw new Error(`Failed to clear database: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Load repository configurations
 */
function loadConfigurations(options: SeedOptions): RepositoryConfig[] {
  if (options.repos && options.repos.length > 0) {
    // Parse CLI repos (simplified - just URL)
    return options.repos.map(repo => {
      const url = repo.startsWith('http') ? repo : `https://github.com/${repo}`
      const name = repo.split('/').pop() || 'unknown'
      
      return {
        url,
        branch: 'main',
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
 * Main seeding function
 */
async function seedFromGitHub(options: SeedOptions): Promise<void> {
  console.log('\n🌟 GitHub SBOM Seeding\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // Check for API token
  const apiToken = process.env.SEED_API_TOKEN
  if (!apiToken) {
    console.error('❌ Error: SEED_API_TOKEN environment variable not set\n')
    console.log('Please create an API token first:')
    console.log('  1. Run: npm run seed')
    console.log('  2. Run: tsx schema/scripts/seed-api-token.ts admin@example.com')
    console.log('  3. Add token to .env: SEED_API_TOKEN=your-token-here\n')
    process.exit(1)
  }
  
  // Clear database if requested
  if (options.clear) {
    await clearDatabase()
  }
  
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
