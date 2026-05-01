import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { createError } from 'h3'
import { mockEvent } from '../../fixtures/h3-event'
import getHandler from '../../../server/api/systems.get'
import postHandler from '../../../server/api/systems.post'
import { systemService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  systemService: { findAll: vi.fn(), create: vi.fn() }
}))

// Auth functions are Nuxt globals — create fns with vi.hoisted so they
// exist before module evaluation, then register them as globals in beforeAll.
const { mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const mockSystem = {
  name: 'polaris-api',
  domain: 'Platform',
  ownerTeam: 'Platform Team',
  businessCriticality: 'high' as const,
  environment: 'prod' as const,
  componentCount: 10,
  repositoryCount: 2
}

const mockUser = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [] }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
})

describe('GET /api/systems', () => {
  it('returns paginated systems with defaults', async () => {
    vi.mocked(systemService.findAll).mockResolvedValue({ data: [mockSystem], count: 1, total: 1 })

    const result = await getHandler(mockEvent())

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(systemService.findAll).toHaveBeenCalledWith(expect.any(Object), 50, 0)
  })

  it('passes parsed limit and offset to service', async () => {
    vi.mocked(systemService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await getHandler(mockEvent({ query: { limit: '10', offset: '20' } }))

    expect(systemService.findAll).toHaveBeenCalledWith(expect.any(Object), 10, 20)
  })

  it('clamps limit to 200', async () => {
    vi.mocked(systemService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await getHandler(mockEvent({ query: { limit: '9999' } }))

    expect(systemService.findAll).toHaveBeenCalledWith(expect.any(Object), 200, 0)
  })

  it('clamps limit minimum to 1', async () => {
    vi.mocked(systemService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await getHandler(mockEvent({ query: { limit: '0' } }))

    expect(systemService.findAll).toHaveBeenCalledWith(expect.any(Object), 1, 0)
  })

  it('rejects non-integer limit', async () => {
    const result = await getHandler(mockEvent({ query: { limit: 'abc' } }))

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/integer/)
    expect(systemService.findAll).not.toHaveBeenCalled()
  })

  it('rejects non-integer offset', async () => {
    const result = await getHandler(mockEvent({ query: { offset: 'xyz' } }))

    expect(result.success).toBe(false)
    expect(systemService.findAll).not.toHaveBeenCalled()
  })

  it('returns error response when service throws', async () => {
    vi.mocked(systemService.findAll).mockRejectedValue(new Error('DB down'))

    const result = await getHandler(mockEvent())

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB down')
  })
})

describe('POST /api/systems', () => {
  const validBody = {
    name: 'new-system',
    domain: 'Platform',
    ownerTeam: 'Platform Team',
    businessCriticality: 'high',
    environment: 'prod'
  }

  it('creates a system and returns success', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    vi.mocked(systemService.create).mockResolvedValue('new-system')

    const result = await postHandler(mockEvent({ method: 'POST', body: validBody }))

    expect(result.success).toBe(true)
    expect(result.data).toEqual([{ name: 'new-system' }])
    expect(systemService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'new-system', userId: 'user-1' })
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
    vi.mocked(systemService.create).mockRejectedValue(
      createError({ statusCode: 409, message: 'System already exists' })
    )

    await expect(postHandler(mockEvent({ method: 'POST', body: validBody }))).rejects.toMatchObject({
      statusCode: 409
    })
  })

  it('wraps unexpected service errors as 500', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    vi.mocked(systemService.create).mockRejectedValue(new Error('unexpected'))

    await expect(postHandler(mockEvent({ method: 'POST', body: validBody }))).rejects.toMatchObject({
      statusCode: 500
    })
  })
})
