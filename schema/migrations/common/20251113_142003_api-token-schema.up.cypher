/*
 * Migration: api-token-schema
 * Version: 20251113.142003
 * Author: @runner
 * Ticket: PROJ-XXX
 * 
 * Description:
 * Add ApiToken node for API authentication with SHA-256 hashed tokens
 *
 * Dependencies:
 * - 20251024_074821_add_user_node.up.cypher (requires User node)
 *
 * Rollback: See 20251113_142003_api-token-schema.down.cypher
 */

// Add ApiToken node for API authentication
// Tokens are stored as SHA-256 hashes for security
// Plaintext tokens are returned only once on creation

// Create ApiToken node constraint (unique id)
CREATE CONSTRAINT api_token_id_unique IF NOT EXISTS
FOR (t:ApiToken) REQUIRE t.id IS UNIQUE;

// Create index on tokenHash for fast lookup during authentication
CREATE INDEX api_token_hash IF NOT EXISTS
FOR (t:ApiToken) ON (t.tokenHash);

// Create index on revoked status for efficient filtering
CREATE INDEX api_token_revoked IF NOT EXISTS
FOR (t:ApiToken) ON (t.revoked);

// ApiToken properties:
// - id: string (UUID, unique token identifier)
// - tokenHash: string (SHA-256 hash of the plaintext token)
// - createdAt: datetime (when the token was created)
// - expiresAt: datetime (optional, when the token expires)
// - revoked: boolean (whether the token has been revoked)
// - createdBy: string (user id who created the token)
// - description: string (optional, human-readable description)

// Relationships:
// - (User)-[:HAS_API_TOKEN]->(ApiToken) - User owns an API token
