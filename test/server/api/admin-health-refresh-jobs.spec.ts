import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import listHandler from '../../../server/api/admin/health-refresh/jobs/index.get'
import detailHandler from '../../../server/api/admin/health-refresh/jobs/[jobId].get'
import cancelHandler from '../../../server/api/admin/health-refresh/jobs/[jobId]/cancel.post'
import deleteHandler from '../../../server/api/admin/health-refresh/jobs/[jobId]/index.delete'
import { healthRefreshService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  healthRefreshService: {
    findAll: vi.fn(),
    findById: vi.fn(),
    cancel: vi.fn(),
    remove: vi.fn()
  }
}))

const { mockRequireSuperuser, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireSuperuser: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireSuperuser', mockRequireSuperuser)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const superuser = { id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: [] }

const mockJob = {
  id: 'job-1',
  status: 'running' as const,
  trigger: 'scheduled' as const,
  systemName: null,
  totalItems: 3,
  completedItems: 1,
  failedItems: 0,
  createdAt: '2026-07-24T10:00:00Z',
  startedAt: '2026-07-24T10:00:01Z',
  finishedAt: null,
  error: null
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireSuperuser.mockResolvedValue(superuser)
})

describe('[contract] GET /api/admin/health-refresh/jobs', () => {
  it('should return jobs with count and total', async () => {
    vi.mocked(healthRefreshService.findAll).mockResolvedValue({ total: 1, jobs: [mockJob] })

    const result = await listHandler(mockEvent())

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('should pass skip/limit/search to the service', async () => {
    vi.mocked(healthRefreshService.findAll).mockResolvedValue({ total: 0, jobs: [] })

    await listHandler(mockEvent({ query: { skip: '20', limit: '10', search: 'acme' } }))

    expect(healthRefreshService.findAll).toHaveBeenCalledWith({
      skip: 20,
      limit: 10,
      statuses: undefined,
      search: 'acme'
    })
  })

  it('should filter out invalid status values', async () => {
    vi.mocked(healthRefreshService.findAll).mockResolvedValue({ total: 0, jobs: [] })

    await listHandler(mockEvent({ query: { status: 'running,bogus,failed' } }))

    expect(healthRefreshService.findAll).toHaveBeenCalledWith(expect.objectContaining({
      statuses: ['running', 'failed']
    }))
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(listHandler(mockEvent())).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('[contract] GET /api/admin/health-refresh/jobs/[jobId]', () => {
  it('should return the job', async () => {
    vi.mocked(healthRefreshService.findById).mockResolvedValue({ ...mockJob, items: [] } as never)

    const result = await detailHandler(mockEvent({ params: { jobId: 'job-1' } }))

    expect(result.success).toBe(true)
    expect(result.data.id).toBe('job-1')
  })

  it('should return 400 when jobId is missing', async () => {
    await expect(
      detailHandler(mockEvent({ params: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should return 404 when the job does not exist', async () => {
    vi.mocked(healthRefreshService.findById).mockResolvedValue(null)

    await expect(
      detailHandler(mockEvent({ params: { jobId: 'missing-job' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(
      detailHandler(mockEvent({ params: { jobId: 'job-1' } }))
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('[contract] POST /api/admin/health-refresh/jobs/[jobId]/cancel', () => {
  it('should cancel the job and return it', async () => {
    vi.mocked(healthRefreshService.cancel).mockResolvedValue({ ...mockJob, status: 'cancelled' } as never)

    const result = await cancelHandler(mockEvent({ method: 'POST', params: { jobId: 'job-1' } }))

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('cancelled')
    expect(healthRefreshService.cancel).toHaveBeenCalledWith('job-1', { userId: 'admin-1', realUserId: null })
  })

  it('should return 400 when jobId is missing', async () => {
    await expect(
      cancelHandler(mockEvent({ method: 'POST', params: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should propagate a 404 when the job does not exist', async () => {
    vi.mocked(healthRefreshService.cancel).mockRejectedValue(
      Object.assign(new Error('Health-refresh job not found'), { statusCode: 404 })
    )

    await expect(
      cancelHandler(mockEvent({ method: 'POST', params: { jobId: 'missing-job' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('should propagate a 409 when the job is already finished', async () => {
    vi.mocked(healthRefreshService.cancel).mockRejectedValue(
      Object.assign(new Error("Cannot cancel a job with status 'completed'"), { statusCode: 409 })
    )

    await expect(
      cancelHandler(mockEvent({ method: 'POST', params: { jobId: 'job-1' } }))
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(
      cancelHandler(mockEvent({ method: 'POST', params: { jobId: 'job-1' } }))
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('[contract] DELETE /api/admin/health-refresh/jobs/[jobId]', () => {
  it('should delete the job', async () => {
    vi.mocked(healthRefreshService.remove).mockResolvedValue(undefined)

    const result = await deleteHandler(mockEvent({ method: 'DELETE', params: { jobId: 'job-1' } }))

    expect(result.success).toBe(true)
    expect(healthRefreshService.remove).toHaveBeenCalledWith('job-1', { userId: 'admin-1', realUserId: null })
  })

  it('should return 400 when jobId is missing', async () => {
    await expect(
      deleteHandler(mockEvent({ method: 'DELETE', params: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should propagate a 404 when the job does not exist', async () => {
    vi.mocked(healthRefreshService.remove).mockRejectedValue(
      Object.assign(new Error('Health-refresh job not found'), { statusCode: 404 })
    )

    await expect(
      deleteHandler(mockEvent({ method: 'DELETE', params: { jobId: 'missing-job' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('should propagate a 409 when the job is still active', async () => {
    vi.mocked(healthRefreshService.remove).mockRejectedValue(
      Object.assign(new Error('Cancel the job before deleting it'), { statusCode: 409 })
    )

    await expect(
      deleteHandler(mockEvent({ method: 'DELETE', params: { jobId: 'job-1' } }))
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(
      deleteHandler(mockEvent({ method: 'DELETE', params: { jobId: 'job-1' } }))
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
