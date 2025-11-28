#!/usr/bin/env node

/**
 * Create Technical User
 * 
 * This script creates a technical user for CI/CD or maintenance purposes.
 * Technical users use the 'technical' provider instead of OAuth providers.
 * 
 * Usage:
 *   npx tsx schema/scripts/create-technical-user.ts <email> [name] [--superuser]
 *   npm run createuser -- <email> [name] [--superuser]
 * 
 * Examples:
 *   npx tsx schema/scripts/create-technical-user.ts ci@example.com "CI Bot"
 *   npx tsx schema/scripts/create-technical-user.ts admin@example.com "Admin Bot" --superuser
 *   npm run createuser -- ci@example.com "CI Bot"
 * 
 * After creating a user, generate an API token using:
 *   npx tsx schema/scripts/seed-api-token.ts <email>
 */

import neo4j from 'neo4j-driver'
import { randomBytes } from 'crypto'
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

async function getDriver() {
  const uri = process.env.NEO4J_URI || 'neo4j://neo4j:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'

  return neo4j.driver(uri, neo4j.auth.basic(username, password))
}

interface CreateUserParams {
  email: string
  name: string
  isSuperuser: boolean
}

async function createTechnicalUser(params: CreateUserParams) {
  const { email, name, isSuperuser } = params
  const driver = await getDriver()
  const session = driver.session()

  try {
    console.log('\n🤖 Creating Technical User\n')

    // Check if user already exists
    const existingUser = await session.run(
      'MATCH (u:User {email: $email}) RETURN u.id as id, u.provider as provider',
      { email }
    )

    if (existingUser.records.length > 0) {
      const existingProvider = existingUser.records[0].get('provider')
      console.error(`❌ Error: User with email "${email}" already exists (provider: ${existingProvider})`)
      console.log('\nTo update an existing user, delete it first or use a different email.\n')
      process.exit(1)
    }

    // Generate unique user ID
    const userId = `technical-${randomBytes(16).toString('hex')}`
    const role = isSuperuser ? 'superuser' : 'user'
    const createdAt = new Date().toISOString()

    // Create technical user
    const result = await session.run(
      `
      CREATE (u:User {
        id: $id,
        email: $email,
        name: $name,
        provider: 'technical',
        role: $role,
        avatarUrl: null,
        createdAt: datetime($createdAt),
        lastLogin: null
      })
      RETURN u.id as id, u.email as email, u.name as name, u.role as role
      `,
      {
        id: userId,
        email,
        name,
        role,
        createdAt
      }
    )

    if (result.records.length === 0) {
      throw new Error('Failed to create user')
    }

    const record = result.records[0]
    
    // Print user information
    console.log('✅ Technical User Created Successfully\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('User Details:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('ID:       ', record.get('id'))
    console.log('Email:    ', record.get('email'))
    console.log('Name:     ', record.get('name'))
    console.log('Provider: ', 'technical')
    console.log('Role:     ', record.get('role'))
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('Next Steps:\n')
    console.log('1. Generate an API token for this user:')
    console.log(`   npx tsx schema/scripts/seed-api-token.ts ${email}\n`)
    console.log('2. (Optional) Assign user to teams via the admin UI or API')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('❌ Error creating technical user:', error)
    process.exit(1)
  } finally {
    await session.close()
    await driver.close()
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('\n📖 Create Technical User\n')
    console.log('Usage:')
    console.log('  npx tsx schema/scripts/create-technical-user.ts <email> [name] [--superuser]')
    console.log('  npm run createuser -- <email> [name] [--superuser]\n')
    console.log('Arguments:')
    console.log('  email       User email address (required)')
    console.log('  name        User display name (optional, defaults to email)')
    console.log('  --superuser Grant superuser role (optional)\n')
    console.log('Examples:')
    console.log('  npx tsx schema/scripts/create-technical-user.ts ci@example.com "CI Bot"')
    console.log('  npx tsx schema/scripts/create-technical-user.ts admin@example.com "Admin" --superuser')
    console.log('  npm run createuser -- ci@example.com "CI Bot"\n')
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1)
  }

  const email = args[0]
  const isSuperuser = args.includes('--superuser')
  
  // Filter out flags to find name
  const nonFlagArgs = args.filter(arg => !arg.startsWith('--'))
  let name = email
  if (nonFlagArgs.length > 1) {
    // Join all non-flag args after email as the name (handles spaces)
    name = nonFlagArgs.slice(1).join(' ')
  }

  // Basic email validation
  if (!email.includes('@')) {
    console.error('\n❌ Error: Invalid email address\n')
    process.exit(1)
  }

  return { email, name, isSuperuser }
}

// Main execution
const params = parseArgs()

createTechnicalUser(params)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
