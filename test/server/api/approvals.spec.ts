import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { createError } from 'h3'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/technologies/[name]/approvals.post'
import { technologyService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  technologyService: { setApproval: vi.fn() }
}))

const { mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const regularUser = {
  id: 'user-1',
  email: 'user@example.com',
  role: 'user' as const,
  teams: [{ name: 'Platform Team' }]
}

const superuser = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'superuser' as const,
  teams: []
}

const validBody = { teamName: 'Platform Team', time: 'invest' }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
})

describe('POST /api/technologies/:name/approvals', () => {
  it('sets approval when user is a member of the team', async () => {
    mockRequireAuth.mockResolvedValue(regularUser)
    vi.mocked(technologyService.setApproval).mockResolvedValue({
      technologyName: 'React', teamName: 'Platform Team', time: 'invest'
    })

    const result = await handler(mockEvent({
      method: 'POST',
      params: { name: 'React' },
      body: validBody
    }))

    expect(result.success).toBe(true)
    expect(technologyService.setApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        technologyName: 'React',
        teamName: 'Platform Team',
        time: 'invest',
        userId: 'user-1'
      })
    )
  })

  it('allows superuser to set approval for any team', async () => {
    mockRequireAuth.mockResolvedValue(superuser)
    vi.mocked(technologyService.setApproval).mockResolvedValue({
      technologyName: 'React', teamName: 'Other Team', time: 'eliminate'
    })

    const result = await handler(mockEvent({
      method: 'POST',
      params: { name: 'React' },
      body: { teamName: 'Other Team', time: 'eliminate' }
    }))

    expect(result.success).toBe(true)
    expect(technologyService.setApproval).toHaveBeenCalled()
  })

  it('throws 403 when user is not a member of the team', async () => {
    mockRequireAuth.mockResolvedValue(regularUser)

    await expect(handler(mockEvent({
      method: 'POST',
      params: { name: 'React' },
      body: { teamName: 'Other Team', time: 'invest' }
    }))).rejects.toMatchObject({ statusCode: 403 })

    expect(technologyService.setApproval).not.toHaveBeenCalled()
  })

  it('throws 400 when teamName is missing', async () => {
    mockRequireAuth.mockResolvedValue(regularUser)

    await expect(handler(mockEvent({
      method: 'POST',
      params: { name: 'React' },
      body: { time: 'invest' }
    }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when time is missing', async () => {
    mockRequireAuth.mockResolvedValue(regularUser)

    await expect(handler(mockEvent({
      method: 'POST',
      params: { name: 'React' },
      body: { teamName: 'Platform Team' }
    }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when technology name param is missing', async () => {
    mockRequireAuth.mockResolvedValue(regularUser)

    await expect(handler(mockEvent({
      method: 'POST',
      params: {},
      body: validBody
    }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 401 when unauthenticated', async () => {
    mockRequireAuth.mockRejectedValue(createError({ statusCode: 401, message: 'Unauthorized' }))

    await expect(handler(mockEvent({
      method: 'POST',
      params: { name: 'React' },
      body: validBody
    }))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('decodes URL-encoded technology name', async () => {
    mockRequireAuth.mockResolvedValue(regularUser)
    vi.mocked(technologyService.setApproval).mockResolvedValue({
      technologyName: 'My Tech', teamName: 'Platform Team', time: 'invest'
    })

    await handler(mockEvent({
      method: 'POST',
      params: { name: 'My%20Tech' },
      body: validBody
    }))

    expect(technologyService.setApproval).toHaveBeenCalledWith(
      expect.objectContaining({ technologyName: 'My Tech' })
    )
  })
})
