import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

/**
 * How the token is used, so audit entries can distinguish a human API call
 * from automation (e.g. "was this a CI/CD pipeline or a person?").
 */
export type TokenType = 'user' | 'ci-cd' | 'service-account'

export interface ApiToken {
  id: string
  tokenHash: string
  createdAt: string
  expiresAt: string | null
  revoked: boolean
  createdBy: string
  description: string | null
  type: TokenType
}

export interface CreateTokenParams {
  id: string
  tokenHash: string
  createdAt: string
  expiresAt: string | null
  createdBy: string
  description: string | null
  type: TokenType
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
    const query = await loadQuery('tokens/create.cypher')

    const { records } = await this.executeQuery(query, { ...params, type: params.type ?? 'user' })

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
    const query = await loadQuery('tokens/find-by-hash.cypher')

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
   * Revoke a token by ID, verifying it belongs to the given user.
   *
   * Returns false (404) if the token does not exist or does not belong to userId,
   * preventing cross-user revocation by superusers.
   *
   * @param tokenId - Token ID
   * @param userId  - User who must own the token
   * @returns true if token was revoked, false if not found or not owned by userId
   */
  async revoke(tokenId: string, userId: string): Promise<boolean> {
    const query = await loadQuery('tokens/revoke.cypher')

    const { records } = await this.executeQuery(query, { tokenId, userId })
    return records.length > 0
  }

  /**
   * Count active (non-revoked) tokens for a user.
   *
   * @param userId - User ID
   * @returns Number of active tokens
   */
  async countActive(userId: string): Promise<number> {
    const query = await loadQuery('tokens/count-active.cypher')
    const { records } = await this.executeQuery(query, { userId })
    return (records[0]?.get('total') as number) ?? 0
  }

  /**
   * List all tokens for a user
   * 
   * @param userId - User ID
   * @returns Array of tokens (without hash)
   */
  async listByUser(userId: string): Promise<Omit<ApiToken, 'tokenHash'>[]> {
    const query = await loadQuery('tokens/list-by-user.cypher')

    const { records } = await this.executeQuery(query, { userId })

    return records.map(record => {
      const token = record.get('token')
      return {
        id: token.id,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        revoked: token.revoked,
        createdBy: token.createdBy,
        description: token.description,
        type: token.type
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
      description: token.description,
      type: token.type
    }
  }
}
