import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { createError } from 'h3'
import { mockEvent } from '../../fixtures/h3-event'
import getHandler from '../../../server/api/technologies.get'
import postHandler from '../../../server/api/technologies.post'
import { technologyService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  technologyService: { findAll: vi.fn(), create: vi.fn() }
}))

const { mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const mockTech = {
  name: 'React',
  type: 'library',
  domain: 'framework',
  vendor: null,
  lastReviewed: null,
  ownerTeamName: null,
  componentCount: 0,
  constraintCount: 0,
  versions: [],
  approvals: []
}

const mockUser = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [] }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
})

describe('GET /api/technologies', () => {
  it('returns paginated technologies with defaults', async () => {
    vi.mocked(technologyService.findAll).mockResolvedValue({ data: [mockTech], count: 1, total: 1 })

    const result = await getHandler(mockEvent())

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(technologyService.findAll).toHaveBeenCalledWith(expect.any(Object), 50, 0)
  })

  it('passes parsed limit and offset to service', async () => {
    vi.mocked(technologyService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await getHandler(mockEvent({ query: { limit: '25', offset: '50' } }))

    expect(technologyService.findAll).toHaveBeenCalledWith(expect.any(Object), 25, 50)
  })

  it('clamps limit to 200', async () => {
    vi.mocked(technologyService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await getHandler(mockEvent({ query: { limit: '500' } }))

    expect(technologyService.findAll).toHaveBeenCalledWith(expect.any(Object), 200, 0)
  })

  it('clamps limit minimum to 1', async () => {
    vi.mocked(technologyService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await getHandler(mockEvent({ query: { limit: '-5' } }))

    expect(technologyService.findAll).toHaveBeenCalledWith(expect.any(Object), 1, 0)
  })

  it('rejects non-integer limit', async () => {
    const result = await getHandler(mockEvent({ query: { limit: 'bad' } }))

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/integer/)
    expect(technologyService.findAll).not.toHaveBeenCalled()
  })

  it('rejects non-integer offset', async () => {
    const result = await getHandler(mockEvent({ query: { offset: 'bad' } }))

    expect(result.success).toBe(false)
    expect(technologyService.findAll).not.toHaveBeenCalled()
  })

  it('passes sort params to service', async () => {
    vi.mocked(technologyService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await getHandler(mockEvent({ query: { sortBy: 'name', sortOrder: 'desc' } }))

    expect(technologyService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'name', sortOrder: 'desc' }),
      50,
      0
    )
  })

  it('returns error response when service throws', async () => {
    vi.mocked(technologyService.findAll).mockRejectedValue(new Error('DB error'))

    const result = await getHandler(mockEvent())

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })
})

describe('POST /api/technologies', () => {
  const validBody = { name: 'React', type: 'library' }

  it('creates a technology and returns success', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    vi.mocked(technologyService.create).mockResolvedValue('React')

    const result = await postHandler(mockEvent({ method: 'POST', body: validBody }))

    expect(result.success).toBe(true)
    expect(result.data).toEqual([{ name: 'React' }])
    expect(technologyService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'React', type: 'library', userId: 'user-1' })
    )
  })

  it('throws 401 when unauthenticated', async () => {
    mockRequireAuth.mockRejectedValue(createError({ statusCode: 401, message: 'Unauthorized' }))

    await expect(postHandler(mockEvent({ method: 'POST', body: validBody }))).rejects.toMatchObject({
      statusCode: 401
    })
  })

  it('re-throws createError from service (e.g. 409 conflict)', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    vi.mocked(technologyService.create).mockRejectedValue(
      createError({ statusCode: 409, message: 'Technology already exists' })
    )

    await expect(postHandler(mockEvent({ method: 'POST', body: validBody }))).rejects.toMatchObject({
      statusCode: 409
    })
  })

  it('wraps unexpected service errors as 500', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    vi.mocked(technologyService.create).mockRejectedValue(new Error('unexpected'))

    await expect(postHandler(mockEvent({ method: 'POST', body: validBody }))).rejects.toMatchObject({
      statusCode: 500
    })
  })
})
