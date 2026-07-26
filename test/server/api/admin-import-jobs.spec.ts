import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import listHandler from '../../../server/api/admin/import/jobs/index.get'
import cancelHandler from '../../../server/api/admin/import/jobs/[jobId]/cancel.post'
import deleteHandler from '../../../server/api/admin/import/jobs/[jobId]/index.delete'
import { gitHubOrgImportService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  gitHubOrgImportService: {
    findAll: vi.fn(),
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
  organization: 'acme',
  requestedBy: 'user-1',
  total: 3,
  completed: 1,
  failed: 0,
  skipped: 0,
  createdAt: '2026-07-24T10:00:00Z',
  startedAt: '2026-07-24T10:00:01Z',
  finishedAt: null,
  error: null
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireSuperuser.mockResolvedValue(superuser)
})

describe('[contract] GET /api/admin/import/jobs', () => {
  it('should return jobs with count and total', async () => {
    vi.mocked(gitHubOrgImportService.findAll).mockResolvedValue({ total: 1, jobs: [mockJob] })

    const result = await listHandler(mockEvent())

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('should pass skip/limit/search to the service', async () => {
    vi.mocked(gitHubOrgImportService.findAll).mockResolvedValue({ total: 0, jobs: [] })

    await listHandler(mockEvent({ query: { skip: '20', limit: '10', search: 'acme' } }))

    expect(gitHubOrgImportService.findAll).toHaveBeenCalledWith({
      skip: 20,
      limit: 10,
      statuses: undefined,
      search: 'acme'
    })
  })

  it('should filter out invalid status values', async () => {
    vi.mocked(gitHubOrgImportService.findAll).mockResolvedValue({ total: 0, jobs: [] })

    await listHandler(mockEvent({ query: { status: 'running,bogus,failed' } }))

    expect(gitHubOrgImportService.findAll).toHaveBeenCalledWith(expect.objectContaining({
      statuses: ['running', 'failed']
    }))
  })

  it('should clamp limit to 100 maximum', async () => {
    vi.mocked(gitHubOrgImportService.findAll).mockResolvedValue({ total: 0, jobs: [] })

    await listHandler(mockEvent({ query: { limit: '999' } }))

    expect(gitHubOrgImportService.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }))
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(listHandler(mockEvent())).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('[contract] POST /api/admin/import/jobs/[jobId]/cancel', () => {
  it('should cancel the job and return it', async () => {
    vi.mocked(gitHubOrgImportService.cancel).mockResolvedValue({ ...mockJob, status: 'cancelled' } as never)

    const result = await cancelHandler(mockEvent({ method: 'POST', params: { jobId: 'job-1' } }))

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('cancelled')
    expect(gitHubOrgImportService.cancel).toHaveBeenCalledWith('job-1', { userId: 'admin-1', realUserId: null })
  })

  it('should return 400 when jobId is missing', async () => {
    await expect(
      cancelHandler(mockEvent({ method: 'POST', params: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should propagate a 404 when the job does not exist', async () => {
    vi.mocked(gitHubOrgImportService.cancel).mockRejectedValue(
      Object.assign(new Error('Import job not found'), { statusCode: 404 })
    )

    await expect(
      cancelHandler(mockEvent({ method: 'POST', params: { jobId: 'missing-job' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('should propagate a 409 when the job is already finished', async () => {
    vi.mocked(gitHubOrgImportService.cancel).mockRejectedValue(
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

describe('[contract] DELETE /api/admin/import/jobs/[jobId]', () => {
  it('should delete the job', async () => {
    vi.mocked(gitHubOrgImportService.remove).mockResolvedValue(undefined)

    const result = await deleteHandler(mockEvent({ method: 'DELETE', params: { jobId: 'job-1' } }))

    expect(result.success).toBe(true)
    expect(gitHubOrgImportService.remove).toHaveBeenCalledWith('job-1', { userId: 'admin-1', realUserId: null })
  })

  it('should return 400 when jobId is missing', async () => {
    await expect(
      deleteHandler(mockEvent({ method: 'DELETE', params: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should propagate a 404 when the job does not exist', async () => {
    vi.mocked(gitHubOrgImportService.remove).mockRejectedValue(
      Object.assign(new Error('Import job not found'), { statusCode: 404 })
    )

    await expect(
      deleteHandler(mockEvent({ method: 'DELETE', params: { jobId: 'missing-job' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('should propagate a 409 when the job is still active', async () => {
    vi.mocked(gitHubOrgImportService.remove).mockRejectedValue(
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
