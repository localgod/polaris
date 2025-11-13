import { createHash, randomBytes } from 'crypto'
import { TokenRepository, type ApiToken, type CreateTokenParams } from '../repositories/token.repository'

export interface CreateTokenOptions {
  description?: string
  expiresInDays?: number
}

export interface CreateTokenResult {
  token: string // Plaintext token (only returned once)
  id: string
  createdAt: string
  expiresAt: string | null
  description: string | null
}

export interface ResolvedToken {
  user: {
    id: string
    email: string
    role: string
    name?: string | null
    teams?: Array<{ name: string; email: string | null }>
  }
  tokenId: string
}

/**
 * Service for API token management
 * 
 * Security notes:
 * - Tokens are generated using crypto.randomBytes (secure random)
 * - Only SHA-256 hashes are stored in the database
 * - Plaintext tokens are returned only once on creation
 * - Tokens should be treated as secrets and never logged
 */
export class TokenService {
  private tokenRepo: TokenRepository

  constructor() {
    this.tokenRepo = new TokenRepository()
  }

  /**
   * Create a new API token for a user
   * 
   * Business rules:
   * - Generates a secure random 32-byte token
   * - Stores only the SHA-256 hash in the database
   * - Returns plaintext token only once
   * - Optional expiration (default: no expiration)
   * 
   * @param userId - User ID who will own the token
   * @param options - Token creation options
   * @returns Token details with plaintext token (returned once)
   */
  async createToken(userId: string, options: CreateTokenOptions = {}): Promise<CreateTokenResult> {
    // Generate secure random token (32 bytes = 256 bits)
    const plaintextToken = this.generateToken()
    
    // Compute SHA-256 hash
    const tokenHash = this.hashToken(plaintextToken)
    
    // Calculate expiration if specified
    const createdAt = new Date().toISOString()
    let expiresAt: string | null = null
    
    if (options.expiresInDays) {
      const expiration = new Date()
      expiration.setDate(expiration.getDate() + options.expiresInDays)
      expiresAt = expiration.toISOString()
    }
    
    // Generate unique ID for the token
    const id = randomBytes(16).toString('hex')
    
    // Store token in database
    const params: CreateTokenParams = {
      id,
      tokenHash,
      createdAt,
      expiresAt,
      createdBy: userId,
      description: options.description || null
    }
    
    const savedToken = await this.tokenRepo.create(params)
    
    return {
      token: plaintextToken, // Return plaintext only once
      id: savedToken.id,
      createdAt: savedToken.createdAt,
      expiresAt: savedToken.expiresAt,
      description: savedToken.description
    }
  }

  /**
   * Resolve a plaintext token to a user
   * 
   * Business rules:
   * - Hashes the incoming token and looks up by hash
   * - Verifies token is not revoked
   * - Verifies token is not expired
   * - Returns normalized user object
   * 
   * @param plaintextToken - The plaintext API token
   * @returns Resolved user or null if invalid/expired/revoked
   */
  async resolveToken(plaintextToken: string): Promise<ResolvedToken | null> {
    // Compute hash of incoming token
    const tokenHash = this.hashToken(plaintextToken)
    
    // Lookup token by hash
    const result = await this.tokenRepo.findByHash(tokenHash)
    
    if (!result) {
      return null
    }
    
    const { token, user } = result
    
    // Check if token is expired
    if (token.expiresAt) {
      const now = new Date()
      const expiration = new Date(token.expiresAt)
      
      if (now > expiration) {
        return null // Token expired
      }
    }
    
    // Return normalized user object
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        teams: user.teams || []
      },
      tokenId: token.id
    }
  }

  /**
   * Revoke a token by ID
   * 
   * @param tokenId - Token ID
   * @returns true if token was revoked, false if not found
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    return await this.tokenRepo.revoke(tokenId)
  }

  /**
   * List all tokens for a user (without hashes)
   * 
   * @param userId - User ID
   * @returns Array of tokens
   */
  async listTokens(userId: string): Promise<Omit<ApiToken, 'tokenHash'>[]> {
    return await this.tokenRepo.listByUser(userId)
  }

  /**
   * Generate a secure random token
   * 
   * @returns Base64-encoded random token (32 bytes)
   */
  private generateToken(): string {
    // Generate 32 random bytes (256 bits)
    return randomBytes(32).toString('base64url') // URL-safe base64
  }

  /**
   * Hash a token using SHA-256
   * 
   * @param token - Plaintext token
   * @returns Hex-encoded SHA-256 hash
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex')
  }
}
