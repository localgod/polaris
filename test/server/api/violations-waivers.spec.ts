import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import createWaiverHandler from '../../../server/api/violations/waivers.post'
import revokeWaiverHandler from '../../../server/api/violations/waivers/[id].delete'
import { waiverService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  waiverService: {
    resolveOwningTeam: vi.fn(),
    create: vi.fn(),
    findForRevoke: vi.fn(),
    revoke: vi.fn()
  }
}))

vi.mock('../../../server/utils/audit', () => ({
  auditFailedOperation: vi.fn()
}))

const { mockRequireTeamAccess, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireTeamAccess: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireTeamAccess', mockRequireTeamAccess)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const user = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [{ name: 'Platform' }] }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
  mockRequireTeamAccess.mockResolvedValue(user)
})

describe('[contract] POST /api/violations/waivers', () => {
  it('returns 400 when required fields are missing', async () => {
    const event = mockEvent({ method: 'POST', body: { violationType: 'compliance' } })
    await expect(createWaiverHandler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when the owning team cannot be resolved', async () => {
    vi.mocked(waiverService.resolveOwningTeam).mockResolvedValue(null)

    const event = mockEvent({
      method: 'POST',
      body: { violationType: 'compliance', naturalKey: { teamName: 'Ghost', technologyName: 'jQuery' }, reason: 'r', expiresAt: '2099-01-01T00:00:00.000Z' }
    })

    await expect(createWaiverHandler(event)).rejects.toMatchObject({ statusCode: 404 })
    expect(mockRequireTeamAccess).not.toHaveBeenCalled()
  })

  it('authorizes against the resolved owning team and creates the waiver', async () => {
    vi.mocked(waiverService.resolveOwningTeam).mockResolvedValue('Platform')
    vi.mocked(waiverService.create).mockResolvedValue({
      id: 'waiver-1', reason: 'accepted', createdBy: 'user-1', createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2099-01-01T00:00:00.000Z'
    })

    const event = mockEvent({
      method: 'POST',
      body: { violationType: 'compliance', naturalKey: { teamName: 'Platform', technologyName: 'jQuery' }, reason: 'accepted', expiresAt: '2099-01-01T00:00:00.000Z' }
    })

    const result = await createWaiverHandler(event)

    expect(mockRequireTeamAccess).toHaveBeenCalledWith(event, 'Platform')
    expect(result).toEqual({ success: true, data: expect.objectContaining({ id: 'waiver-1' }) })
  })

  it('audits a failed creation with the acting user', async () => {
    vi.mocked(waiverService.resolveOwningTeam).mockResolvedValue('Platform')
    vi.mocked(waiverService.create).mockRejectedValue(new Error('boom'))
    const { auditFailedOperation } = await import('../../../server/utils/audit')

    const event = mockEvent({
      method: 'POST',
      body: { violationType: 'compliance', naturalKey: { teamName: 'Platform', technologyName: 'jQuery' }, reason: 'accepted', expiresAt: '2099-01-01T00:00:00.000Z' }
    })

    await expect(createWaiverHandler(event)).rejects.toThrow('boom')
    expect(auditFailedOperation).toHaveBeenCalledWith(event, expect.objectContaining({ operation: 'CREATE', entityType: 'Waiver', userId: 'user-1' }))
  })
})

describe('[contract] DELETE /api/violations/waivers/[id]', () => {
  it('returns 404 when the waiver does not exist', async () => {
    vi.mocked(waiverService.findForRevoke).mockResolvedValue(null)

    const event = mockEvent({ method: 'DELETE', params: { id: 'nonexistent' } })

    await expect(revokeWaiverHandler(event)).rejects.toMatchObject({ statusCode: 404 })
    expect(mockRequireTeamAccess).not.toHaveBeenCalled()
  })

  it('authorizes against the waiver\'s owning team and revokes it', async () => {
    vi.mocked(waiverService.findForRevoke).mockResolvedValue({
      id: 'waiver-1', revokedAt: null, violationType: 'ComplianceViolation', teamName: 'Platform'
    })

    const event = mockEvent({ method: 'DELETE', params: { id: 'waiver-1' } })
    await revokeWaiverHandler(event)

    expect(mockRequireTeamAccess).toHaveBeenCalledWith(event, 'Platform')
    expect(waiverService.revoke).toHaveBeenCalledWith('waiver-1', 'user-1', null)
  })

  it('falls back to an unmatchable team name when ownership cannot be resolved, so only superusers can revoke', async () => {
    vi.mocked(waiverService.findForRevoke).mockResolvedValue({
      id: 'waiver-1', revokedAt: null, violationType: 'LicenseViolation', teamName: null
    })

    const event = mockEvent({ method: 'DELETE', params: { id: 'waiver-1' } })
    await revokeWaiverHandler(event)

    expect(mockRequireTeamAccess).toHaveBeenCalledWith(event, '')
  })
})
