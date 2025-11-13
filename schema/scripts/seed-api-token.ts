#!/usr/bin/env node

/**
 * Seed Initial API Token
 * 
 * This script creates an initial API token for a specified user.
 * The plaintext token is printed to the console ONCE and should be recorded securely.
 * 
 * Usage:
 *   tsx schema/scripts/seed-api-token.ts <user-email>
 * 
 * Example:
 *   tsx schema/scripts/seed-api-token.ts admin@example.com
 */

import neo4j from 'neo4j-driver'
import { randomBytes, createHash } from 'crypto'
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

function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

async function seedApiToken(userEmail: string) {
  const driver = await getDriver()
  const session = driver.session()

  try {
    console.log('\n🔑 Creating API Token\n')

    // Check if user exists
    const userResult = await session.run(
      'MATCH (u:User {email: $email}) RETURN u.id as id, u.email as email',
      { email: userEmail }
    )

    if (userResult.records.length === 0) {
      console.error(`❌ Error: User with email "${userEmail}" not found.`)
      console.log('\nAvailable users:')
      
      const usersResult = await session.run('MATCH (u:User) RETURN u.email as email ORDER BY u.email')
      usersResult.records.forEach(record => {
        console.log(`  - ${record.get('email')}`)
      })
      
      process.exit(1)
    }

    const userId = userResult.records[0].get('id')

    // Generate token
    const plaintextToken = generateToken()
    const tokenHash = hashToken(plaintextToken)
    const tokenId = randomBytes(16).toString('hex')
    const createdAt = new Date().toISOString()
    
    // Set expiration to 1 year from now (optional, can be null for no expiration)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Create token in database
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})
      CREATE (t:ApiToken {
        id: $id,
        tokenHash: $tokenHash,
        createdAt: datetime($createdAt),
        expiresAt: datetime($expiresAt),
        revoked: false,
        createdBy: $userId,
        description: 'Initial API token (seeded)'
      })
      CREATE (u)-[:HAS_API_TOKEN]->(t)
      RETURN t.id as tokenId
      `,
      {
        id: tokenId,
        tokenHash,
        createdAt,
        expiresAt: expiresAt.toISOString(),
        userId
      }
    )

    if (result.records.length === 0) {
      throw new Error('Failed to create token')
    }

    // Print token information
    console.log('✅ API Token Created Successfully\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  SECURITY WARNING: This token will only be shown ONCE!')
    console.log('   Store it securely. You will not be able to retrieve it again.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('Token ID:', tokenId)
    console.log('User Email:', userEmail)
    console.log('Expires:', expiresAt.toISOString())
    console.log('\n📋 Your API Token:\n')
    console.log(`   ${plaintextToken}\n`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('Usage:')
    console.log('  curl -H "Authorization: Bearer <token>" https://your-api.com/api/sboms\n')
    console.log('To revoke this token, use the token ID shown above.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('❌ Error creating API token:', error)
    process.exit(1)
  } finally {
    await session.close()
    await driver.close()
  }
}

// Main execution
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('\n❌ Error: User email required\n')
  console.log('Usage:')
  console.log('  tsx schema/scripts/seed-api-token.ts <user-email>\n')
  console.log('Example:')
  console.log('  tsx schema/scripts/seed-api-token.ts admin@example.com\n')
  process.exit(1)
}

const userEmail = args[0]

seedApiToken(userEmail)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
