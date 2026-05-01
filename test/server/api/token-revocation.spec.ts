import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { createError } from 'h3'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/admin/users/[userId]/tokens/[tokenId].delete'
import { tokenService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  tokenService: { revokeToken: vi.fn() }
}))

vi.mock('../../../server/repositories/audit-log.repository', () => ({
  AuditLogRepository: vi.fn().mockImplementation(function (this: { create: ReturnType<typeof vi.fn> }) {
    this.create = vi.fn().mockResolvedValue(undefined)
  })
}))

const { mockRequireSuperuser, mockGetCurrentUser, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireSuperuser: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireSuperuser', mockRequireSuperuser)
  vi.stubGlobal('getCurrentUser', mockGetCurrentUser)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const superuser = { id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: [] }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
  mockGetCurrentUser.mockResolvedValue(superuser)
})

describe('DELETE /api/admin/users/:userId/tokens/:tokenId', () => {
  it('revokes a token when superuser and ownership matches', async () => {
    mockRequireSuperuser.mockResolvedValue(superuser)
    vi.mocked(tokenService.revokeToken).mockResolvedValue(true)

    const result = await handler(mockEvent({
      method: 'DELETE',
      params: { userId: 'user-1', tokenId: 'tok-1' }
    }))

    expect(result.success).toBe(true)
    expect(tokenService.revokeToken).toHaveBeenCalledWith('tok-1', 'user-1')
  })

  it('throws 404 when token does not belong to userId (IDOR prevention)', async () => {
    mockRequireSuperuser.mockResolvedValue(superuser)
    vi.mocked(tokenService.revokeToken).mockResolvedValue(false)

    await expect(handler(mockEvent({
      method: 'DELETE',
      params: { userId: 'wrong-user', tokenId: 'tok-1' }
    }))).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 401 when not authenticated', async () => {
    mockRequireSuperuser.mockRejectedValue(createError({ statusCode: 401, message: 'Unauthorized' }))

    await expect(handler(mockEvent({
      method: 'DELETE',
      params: { userId: 'user-1', tokenId: 'tok-1' }
    }))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 403 when authenticated but not superuser', async () => {
    mockRequireSuperuser.mockRejectedValue(
      createError({ statusCode: 403, message: 'Superuser access required' })
    )

    await expect(handler(mockEvent({
      method: 'DELETE',
      params: { userId: 'user-1', tokenId: 'tok-1' }
    }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 400 when tokenId is missing', async () => {
    mockRequireSuperuser.mockResolvedValue(superuser)

    await expect(handler(mockEvent({
      method: 'DELETE',
      params: { userId: 'user-1' }
    }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when userId is missing', async () => {
    mockRequireSuperuser.mockResolvedValue(superuser)

    await expect(handler(mockEvent({
      method: 'DELETE',
      params: { tokenId: 'tok-1' }
    }))).rejects.toMatchObject({ statusCode: 400 })
  })
})
