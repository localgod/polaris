import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

export interface ApiToken {
  id: string
  tokenHash: string
  createdAt: string
  expiresAt: string | null
  revoked: boolean
  createdBy: string
  description: string | null
}

export interface CreateTokenParams {
  id: string
  tokenHash: string
  createdAt: string
  expiresAt: string | null
  createdBy: string
  description: string | null
}

export interface TokenWithUser {
  token: ApiToken
  user: {
    id: string
    email: string
    role: string
    teams: Array<{ name: string; email: string | null }>
  }
}

/**
 * Repository for API token-related data access
 */
export class TokenRepository extends BaseRepository {
  /**
   * Create a new API token
   * 
   * @param params - Token creation parameters
   * @returns Created token
   */
  async create(params: CreateTokenParams): Promise<ApiToken> {
    const query = `
      MATCH (u:User {id: $createdBy})
      CREATE (t:ApiToken {
        id: $id,
        tokenHash: $tokenHash,
        createdAt: datetime($createdAt),
        expiresAt: datetime($expiresAt),
        revoked: false,
        createdBy: $createdBy,
        description: $description
      })
      CREATE (u)-[:HAS_API_TOKEN]->(t)
      RETURN t {
        .id,
        .tokenHash,
        createdAt: toString(t.createdAt),
        expiresAt: toString(t.expiresAt),
        .revoked,
        .createdBy,
        .description
      } as token
    `
    
    const { records } = await this.executeQuery(query, params)
    
    if (records.length === 0) {
      throw new Error('Failed to create token - user not found')
    }
    
    return this.mapToToken(records[0]!)
  }

  /**
   * Find token by hash with associated user
   * 
   * @param tokenHash - SHA-256 hash of the token
   * @returns Token with user or null if not found
   */
  async findByHash(tokenHash: string): Promise<TokenWithUser | null> {
    const query = `
      MATCH (t:ApiToken {tokenHash: $tokenHash, revoked: false})<-[:HAS_API_TOKEN]-(u:User)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(team:Team)
      WITH t, u, collect(team {.name, .email}) as teams
      RETURN t {
        .id,
        .tokenHash,
        createdAt: toString(t.createdAt),
        expiresAt: toString(t.expiresAt),
        .revoked,
        .createdBy,
        .description
      } as token,
      u {
        .id,
        .email,
        .role,
        teams: teams
      } as user
    `
    
    const { records } = await this.executeQuery(query, { tokenHash })
    
    if (records.length === 0) {
      return null
    }
    
    const record = records[0]!
    return {
      token: this.mapToToken(record),
      user: record.get('user')
    }
  }

  /**
   * Revoke a token by ID
   * 
   * @param tokenId - Token ID
   * @returns true if token was revoked, false if not found
   */
  async revoke(tokenId: string): Promise<boolean> {
    const query = `
      MATCH (t:ApiToken {id: $tokenId})
      SET t.revoked = true
      RETURN t
    `
    
    const { records } = await this.executeQuery(query, { tokenId })
    return records.length > 0
  }

  /**
   * List all tokens for a user
   * 
   * @param userId - User ID
   * @returns Array of tokens (without hash)
   */
  async listByUser(userId: string): Promise<Omit<ApiToken, 'tokenHash'>[]> {
    const query = `
      MATCH (u:User {id: $userId})-[:HAS_API_TOKEN]->(t:ApiToken)
      RETURN t {
        .id,
        createdAt: toString(t.createdAt),
        expiresAt: toString(t.expiresAt),
        .revoked,
        .createdBy,
        .description
      } as token
      ORDER BY t.createdAt DESC
    `
    
    const { records } = await this.executeQuery(query, { userId })
    
    return records.map(record => {
      const token = record.get('token')
      return {
        id: token.id,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        revoked: token.revoked,
        createdBy: token.createdBy,
        description: token.description
      }
    })
  }

  /**
   * Map Neo4j record to ApiToken
   */
  private mapToToken(record: Neo4jRecord): ApiToken {
    const token = record.get('token')
    return {
      id: token.id,
      tokenHash: token.tokenHash,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      revoked: token.revoked,
      createdBy: token.createdBy,
      description: token.description
    }
  }
}
