import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/audit-logs.get'
import { auditLogService } from '../../../server/services/singletons'

const { mockAuditCreate, mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockAuditCreate: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

vi.mock('../../../server/repositories/audit-log.repository', () => ({
  AuditLogRepository: vi.fn().mockImplementation(function (this: { create: typeof mockAuditCreate }) {
    this.create = mockAuditCreate
  })
}))

vi.mock('../../../server/services/singletons', () => ({
  auditLogService: { getAuditLogs: vi.fn() }
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const memberUser = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [] }
const otherUser = { id: 'user-2', email: 'other@example.com', role: 'user' as const, teams: [] }
const superuser = { id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: [] }

const emptyResult = { data: [], count: 0, filters: { entityTypes: [], operations: [] } }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
  vi.mocked(auditLogService.getAuditLogs).mockResolvedValue(emptyResult)
})

describe('[contract] GET /api/audit-logs — non-superusers cannot read org-wide audit history', () => {
  it('scopes an unfiltered request to the caller\'s own userId when the caller is not a superuser', async () => {
    mockRequireAuth.mockResolvedValue(memberUser)

    await handler(mockEvent({ method: 'GET' }))

    expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    )
  })

  it('rejects a non-superuser explicitly requesting another user\'s history', async () => {
    mockRequireAuth.mockResolvedValue(memberUser)

    await expect(
      handler(mockEvent({ method: 'GET', query: { userId: otherUser.id } }))
    ).rejects.toThrow('You can only view your own audit history')

    expect(auditLogService.getAuditLogs).not.toHaveBeenCalled()
  })

  it('allows a non-superuser to explicitly request their own history', async () => {
    mockRequireAuth.mockResolvedValue(memberUser)

    await handler(mockEvent({ method: 'GET', query: { userId: memberUser.id } }))

    expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    )
  })

  it('leaves the query unfiltered for a superuser requesting the full org log', async () => {
    mockRequireAuth.mockResolvedValue(superuser)

    await handler(mockEvent({ method: 'GET' }))

    expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined })
    )
  })

  it('does not flag a self-service read (own history) as a sensitive read', async () => {
    mockRequireAuth.mockResolvedValue(memberUser)

    await handler(mockEvent({ method: 'GET' }))

    expect(mockAuditCreate).not.toHaveBeenCalled()
  })

  it('flags an unfiltered org-wide read by a superuser as a sensitive read', async () => {
    mockRequireAuth.mockResolvedValue(superuser)

    await handler(mockEvent({ method: 'GET' }))

    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'READ_SENSITIVE',
      entityType: 'AuditLog',
      entityId: 'all',
      userId: 'admin-1'
    }))
  })
})
