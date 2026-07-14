import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import createTechnologyHandler from '../../../server/api/technologies.post'
import listAdminUsersHandler from '../../../server/api/admin/users/index.get'
import { technologyService, userService } from '../../../server/services/singletons'

const { mockAuditCreate, mockRequireSuperuser, mockGetCurrentUser, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockAuditCreate: vi.fn(),
  mockRequireSuperuser: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

vi.mock('../../../server/repositories/audit-log.repository', () => ({
  AuditLogRepository: vi.fn().mockImplementation(function (this: { create: typeof mockAuditCreate }) {
    this.create = mockAuditCreate
  })
}))

vi.mock('../../../server/services/singletons', () => ({
  technologyService: { createFromComponent: vi.fn() },
  userService: { findAll: vi.fn() }
}))

beforeAll(() => {
  vi.stubGlobal('requireSuperuser', mockRequireSuperuser)
  vi.stubGlobal('getCurrentUser', mockGetCurrentUser)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const mockSuperuser = { id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: [] }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
  mockGetCurrentUser.mockResolvedValue(mockSuperuser)
  mockRequireSuperuser.mockResolvedValue(mockSuperuser)
})

describe('POST /api/technologies — failed CRUD attempts are audited', () => {
  it('writes a CREATE_FAILED audit entry when the service rejects, then still surfaces the error', async () => {
    vi.mocked(technologyService.createFromComponent).mockRejectedValue(new Error('No unlinked component named "react" was found'))

    await expect(
      createTechnologyHandler(mockEvent({
        method: 'POST',
        body: { name: 'react', type: 'library', componentName: 'react' }
      }))
    ).rejects.toThrow()

    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'CREATE_FAILED',
      entityType: 'Technology',
      entityId: 'react',
      reason: 'No unlinked component named "react" was found',
      userId: 'admin-1'
    }))
  })

  it('does not write a failure audit entry when creation succeeds', async () => {
    vi.mocked(technologyService.createFromComponent).mockResolvedValue('react')

    await createTechnologyHandler(mockEvent({
      method: 'POST',
      body: { name: 'react', type: 'library', componentName: 'react' }
    }))

    expect(mockAuditCreate).not.toHaveBeenCalled()
  })
})

describe('GET /admin/users — sensitive reads are audited', () => {
  it('writes a READ_SENSITIVE audit entry when the user list is retrieved', async () => {
    vi.mocked(userService.findAll).mockResolvedValue({ data: [], count: 0 })

    await listAdminUsersHandler(mockEvent())

    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'READ_SENSITIVE',
      entityType: 'User',
      entityId: 'all',
      userId: 'admin-1'
    }))
  })
})
