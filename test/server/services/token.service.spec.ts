import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TokenService } from '../../../server/services/token.service'
import { TokenRepository } from '../../../server/repositories/token.repository'

vi.mock('../../../server/repositories/token.repository')

describe('TokenService', () => {
  let service: TokenService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TokenService()
  })

  describe('createToken()', () => {
    it('should create a token and return plaintext + metadata', async () => {
      vi.mocked(TokenRepository.prototype.create).mockResolvedValue({
        id: 'token-id', tokenHash: 'hash', createdAt: '2026-01-01',
        expiresAt: null, revoked: false, createdBy: 'user-1', description: null
      })

      const result = await service.createToken('user-1')

      expect(result.token).toBeDefined()
      expect(result.token.length).toBeGreaterThan(0)
      expect(result.id).toBe('token-id')
      expect(TokenRepository.prototype.create).toHaveBeenCalledOnce()
    })

    it('should pass expiration when specified', async () => {
      vi.mocked(TokenRepository.prototype.create).mockResolvedValue({
        id: 'token-id', tokenHash: 'hash', createdAt: '2026-01-01',
        expiresAt: '2026-01-31', revoked: false, createdBy: 'user-1', description: null
      })

      const result = await service.createToken('user-1', { expiresInDays: 30 })

      expect(result).toBeDefined()
      const createCall = vi.mocked(TokenRepository.prototype.create).mock.calls[0][0]
      expect(createCall.expiresAt).not.toBeNull()
    })
  })

  describe('resolveToken()', () => {
    it('should return null for non-existent token', async () => {
      vi.mocked(TokenRepository.prototype.findByHash).mockResolvedValue(null)

      expect(await service.resolveToken('invalid-token')).toBeNull()
    })

    it('should return user data for valid token', async () => {
      vi.mocked(TokenRepository.prototype.findByHash).mockResolvedValue({
        token: {
          id: 'token-id', tokenHash: 'hash', createdAt: '2026-01-01',
          expiresAt: null, revoked: false, createdBy: 'user-1', description: null
        },
        user: { id: 'user-1', email: 'test@test.com', role: 'user', teams: [] }
      } as any)

      const result = await service.resolveToken('some-token')

      expect(result).not.toBeNull()
      expect(result!.user.id).toBe('user-1')
      expect(result!.tokenId).toBe('token-id')
    })

    it('should return null for expired token', async () => {
      vi.mocked(TokenRepository.prototype.findByHash).mockResolvedValue({
        token: {
          id: 'token-id', tokenHash: 'hash', createdAt: '2025-01-01',
          expiresAt: '2025-01-02', revoked: false, createdBy: 'user-1', description: null
        },
        user: { id: 'user-1', email: 'test@test.com', role: 'user', teams: [] }
      } as any)

      expect(await service.resolveToken('expired-token')).toBeNull()
    })
  })

  describe('revokeToken()', () => {
    it('should delegate to repository', async () => {
      vi.mocked(TokenRepository.prototype.revoke).mockResolvedValue(true)

      expect(await service.revokeToken('token-id')).toBe(true)
      expect(TokenRepository.prototype.revoke).toHaveBeenCalledWith('token-id')
    })
  })

  describe('listTokens()', () => {
    it('should return tokens for user', async () => {
      vi.mocked(TokenRepository.prototype.listByUser).mockResolvedValue([
        { id: 't1', tokenHash: '', createdAt: '', expiresAt: null, revoked: false, createdBy: 'u1', description: null }
      ])

      const result = await service.listTokens('u1')

      expect(result).toHaveLength(1)
      expect(TokenRepository.prototype.listByUser).toHaveBeenCalledWith('u1')
    })
  })
})
