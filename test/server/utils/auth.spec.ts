import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import {
  getCurrentUser,
  getImpersonatorId,
  getRealUser,
  getUserTeams,
  isMemberOfTeam,
  canManageTeam,
  requireAuth,
  requireAuthorization,
  requireSuperuser,
  requireTeamAccess,
  requireTeamMembership,
  validateTeamOwnership,
} from '../../../server/utils/auth'
import { tokenService, userService } from '../../../server/services/singletons'
import { getServerSession } from '#auth'
import { UserRepository } from '../../../server/repositories/user.repository'
import { TeamRepository } from '../../../server/repositories/team.repository'

// Mock the singletons so resolveToken is fully controlled
vi.mock('../../../server/services/singletons', () => ({
  tokenService: { resolveToken: vi.fn() },
  userService: { getAuthData: vi.fn() },
}))

vi.mock('../../../server/repositories/user.repository')
vi.mock('../../../server/repositories/team.repository')

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
  tokenId: 'token-1',
  tokenType: 'user' as const,
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

  describe('event.context.auditSource derived from token type', () => {
    it('sets "API" for a personal (user) token', async () => {
      vi.mocked(tokenService.resolveToken).mockResolvedValue({ ...resolvedUser, tokenType: 'user' })
      const event = mockEvent({ headers: { authorization: 'Bearer abc123' } })

      await getRealUser(event)

      expect(event.context.auditSource).toBe('API')
    })

    it('sets "API (ci-cd)" for a CI/CD token', async () => {
      vi.mocked(tokenService.resolveToken).mockResolvedValue({ ...resolvedUser, tokenType: 'ci-cd' })
      const event = mockEvent({ headers: { authorization: 'Bearer abc123' } })

      await getRealUser(event)

      expect(event.context.auditSource).toBe('API (ci-cd)')
    })

    it('sets "API (service-account)" for a service-account token', async () => {
      vi.mocked(tokenService.resolveToken).mockResolvedValue({ ...resolvedUser, tokenType: 'service-account' })
      const event = mockEvent({ headers: { authorization: 'Bearer abc123' } })

      await getRealUser(event)

      expect(event.context.auditSource).toBe('API (service-account)')
    })

    it('leaves auditSource unset when falling back to session auth', async () => {
      const sessionUser = { id: 'session-user', email: 'session@example.com', role: 'user' as const, teams: [] }
      vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })
      const event = mockEvent()

      await getRealUser(event)

      expect(event.context.auditSource).toBeUndefined()
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

describe('getCurrentUser()', () => {
  it('returns real user when no impersonation cookie is set', async () => {
    const sessionUser = { id: 'u1', email: 'a@example.com', role: 'user' as const, teams: [] }
    vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })

    const user = await getCurrentUser(mockEvent())

    expect(user).toEqual(sessionUser)
    expect(userService.getAuthData).not.toHaveBeenCalled()
  })

  it('returns real user when user is not superuser even with impersonation cookie', async () => {
    const sessionUser = { id: 'u1', email: 'a@example.com', role: 'user' as const, teams: [] }
    vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })

    const user = await getCurrentUser(mockEvent({ headers: { cookie: 'polaris-impersonate=target-user' } }))

    expect(user).toEqual(sessionUser)
    expect(userService.getAuthData).not.toHaveBeenCalled()
  })

  it('returns impersonated user when superuser has impersonation cookie', async () => {
    const sessionUser = { id: 'admin', email: 'admin@example.com', role: 'superuser' as const, teams: [] }
    vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })
    vi.mocked(userService.getAuthData).mockResolvedValue({
      email: 'imp@example.com',
      role: 'user',
      teams: [{ name: 'Platform' }],
    })

    const user = await getCurrentUser(mockEvent({ headers: { cookie: 'polaris-impersonate=target-user' } }))

    expect(user).toEqual({
      id: 'target-user',
      email: 'imp@example.com',
      role: 'user',
      teams: [{ name: 'Platform' }],
    })
  })

  it('falls back to real user when impersonated user lookup fails', async () => {
    const sessionUser = { id: 'admin', email: 'admin@example.com', role: 'superuser' as const, teams: [] }
    vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })
    vi.mocked(userService.getAuthData).mockRejectedValue(new Error('lookup failed'))

    const user = await getCurrentUser(mockEvent({ headers: { cookie: 'polaris-impersonate=target-user' } }))

    expect(user).toEqual(sessionUser)
  })
})

describe('getImpersonatorId()', () => {
  it('returns null when not impersonating', async () => {
    const sessionUser = { id: 'admin', email: 'admin@example.com', role: 'superuser' as const, teams: [] }
    vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })

    await expect(getImpersonatorId(mockEvent())).resolves.toBeNull()
  })

  it('returns real user id when impersonating', async () => {
    const sessionUser = { id: 'admin', email: 'admin@example.com', role: 'superuser' as const, teams: [] }
    vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })
    vi.mocked(userService.getAuthData).mockResolvedValue({ email: 'imp@example.com', role: 'user', teams: [] })

    await expect(
      getImpersonatorId(mockEvent({ headers: { cookie: 'polaris-impersonate=target-user' } }))
    ).resolves.toBe('admin')
  })
})

describe('authorization helpers', () => {
  it('requireAuth throws 401 when no user exists', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    await expect(requireAuth(mockEvent())).rejects.toMatchObject({ statusCode: 401 })
  })

  it('requireSuperuser throws for non-superuser', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', role: 'user', teams: [] },
      expires: ''
    })

    await expect(requireSuperuser(mockEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('requireTeamMembership throws when user has no teams', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', role: 'user', teams: [] },
      expires: ''
    })

    await expect(requireTeamMembership(mockEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('requireAuthorization allows superusers', async () => {
    const sessionUser = { id: 'admin', email: 'admin@example.com', role: 'superuser' as const, teams: [] }
    vi.mocked(getServerSession).mockResolvedValue({ user: sessionUser, expires: '' })

    await expect(requireAuthorization(mockEvent())).resolves.toEqual(sessionUser)
  })

  it('requireAuthorization throws for regular users without teams', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', role: 'user', teams: [] },
      expires: ''
    })

    await expect(requireAuthorization(mockEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('isMemberOfTeam returns true for matching team', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', role: 'user', teams: [{ name: 'Platform' }] },
      expires: ''
    })

    await expect(isMemberOfTeam(mockEvent(), 'Platform')).resolves.toBe(true)
  })

  it('canManageTeam uses repository for non-superusers', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', role: 'user', teams: [] },
      expires: ''
    })
    vi.mocked(UserRepository.prototype.canManageTeam).mockResolvedValue(true)

    await expect(canManageTeam(mockEvent(), 'Platform')).resolves.toBe(true)
    expect(UserRepository.prototype.canManageTeam).toHaveBeenCalledWith('u1', 'Platform')
  })

  it('requireTeamAccess throws when user is not a member of target team', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', role: 'user', teams: [{ name: 'Other' }] },
      expires: ''
    })

    await expect(requireTeamAccess(mockEvent(), 'Platform')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('getUserTeams returns all team names for superusers', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin', email: 'admin@example.com', role: 'superuser', teams: [] },
      expires: ''
    })
    vi.mocked(TeamRepository.prototype.findAllNames).mockResolvedValue(['Platform', 'Security'])

    await expect(getUserTeams(mockEvent())).resolves.toEqual(['Platform', 'Security'])
  })

  it('validateTeamOwnership throws when resource is not owned by user teams', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', role: 'user', teams: [{ name: 'Platform' }] },
      expires: ''
    })
    vi.mocked(TeamRepository.prototype.ownsSystem).mockResolvedValue(false)

    await expect(validateTeamOwnership(mockEvent(), 'System', 'orders-api')).rejects.toMatchObject({ statusCode: 403 })
  })
})
