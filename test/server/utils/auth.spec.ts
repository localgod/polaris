import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import { getRealUser } from '../../../server/utils/auth'
import { tokenService } from '../../../server/services/singletons'
import { getServerSession } from '#auth'

// Mock the singletons so resolveToken is fully controlled
vi.mock('../../../server/services/singletons', () => ({
  tokenService: { resolveToken: vi.fn() },
  userService: { getAuthData: vi.fn() },
}))

// Mock #auth so getServerSession is controllable
vi.mock('#auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))

const resolvedUser = {
  user: {
    id: 'user-1',
    email: 'user@example.com',
    role: 'user' as const,
    teams: [],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerSession).mockResolvedValue(null)
})

describe('getRealUser — Bearer token extraction', () => {
  describe('case-insensitive scheme matching (RFC 7235)', () => {
    it('accepts canonical "Bearer" casing', async () => {
      vi.mocked(tokenService.resolveToken).mockResolvedValue(resolvedUser)
      const event = mockEvent({ headers: { authorization: 'Bearer abc123' } })

      const user = await getRealUser(event)

      expect(tokenService.resolveToken).toHaveBeenCalledWith('abc123')
      expect(user?.id).toBe('user-1')
    })

    it('accepts lowercase "bearer"', async () => {
      vi.mocked(tokenService.resolveToken).mockResolvedValue(resolvedUser)
      const event = mockEvent({ headers: { authorization: 'bearer abc123' } })

      const user = await getRealUser(event)

      expect(tokenService.resolveToken).toHaveBeenCalledWith('abc123')
      expect(user?.id).toBe('user-1')
    })

    it('accepts uppercase "BEARER"', async () => {
      vi.mocked(tokenService.resolveToken).mockResolvedValue(resolvedUser)
      const event = mockEvent({ headers: { authorization: 'BEARER abc123' } })

      const user = await getRealUser(event)

      expect(tokenService.resolveToken).toHaveBeenCalledWith('abc123')
      expect(user?.id).toBe('user-1')
    })

    it('accepts mixed casing "bEaReR"', async () => {
      vi.mocked(tokenService.resolveToken).mockResolvedValue(resolvedUser)
      const event = mockEvent({ headers: { authorization: 'bEaReR abc123' } })

      await getRealUser(event)

      expect(tokenService.resolveToken).toHaveBeenCalledWith('abc123')
    })
  })

  describe('empty and whitespace-only tokens', () => {
    it('does not call resolveToken when token is absent ("Bearer " with trailing space)', async () => {
      const event = mockEvent({ headers: { authorization: 'Bearer ' } })

      await getRealUser(event)

      expect(tokenService.resolveToken).not.toHaveBeenCalled()
    })

    it('does not call resolveToken when token is only whitespace', async () => {
      const event = mockEvent({ headers: { authorization: 'Bearer    ' } })

      await getRealUser(event)

      expect(tokenService.resolveToken).not.toHaveBeenCalled()
    })
  })

  describe('fallback behaviour', () => {
    it('falls back to session when no Authorization header is present', async () => {
      const sessionUser = { id: 'session-user', email: 'session@example.com', role: 'user' as const, teams: [] }
      vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })
      const event = mockEvent()

      const user = await getRealUser(event)

      expect(tokenService.resolveToken).not.toHaveBeenCalled()
      expect(user?.id).toBe('session-user')
    })

    it('falls back to session when token resolves to null (unknown token)', async () => {
      vi.mocked(tokenService.resolveToken).mockResolvedValue(null)
      const sessionUser = { id: 'session-user', email: 'session@example.com', role: 'user' as const, teams: [] }
      vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })
      const event = mockEvent({ headers: { authorization: 'Bearer unknown-token' } })

      const user = await getRealUser(event)

      expect(user?.id).toBe('session-user')
    })

    it('falls back to session when resolveToken throws', async () => {
      vi.mocked(tokenService.resolveToken).mockRejectedValue(new Error('DB error'))
      const sessionUser = { id: 'session-user', email: 'session@example.com', role: 'user' as const, teams: [] }
      vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })
      const event = mockEvent({ headers: { authorization: 'Bearer bad-token' } })

      const user = await getRealUser(event)

      expect(user?.id).toBe('session-user')
    })

    it('returns null when no Authorization header and no session', async () => {
      const event = mockEvent()

      const user = await getRealUser(event)

      expect(user).toBeNull()
    })
  })
})
