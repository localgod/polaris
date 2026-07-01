import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/technologies/[name]/components.post'
import { technologyService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  technologyService: {
    linkComponent: vi.fn(),
    linkComponentByPurl: vi.fn()
  }
}))

const { mockRequireAuth, mockRequireSuperuser, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockRequireSuperuser: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('requireSuperuser', mockRequireSuperuser)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const user = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [] }
const superuser = { id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: [] }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockResolvedValue(user)
  mockRequireSuperuser.mockResolvedValue(superuser)
  mockGetImpersonatorId.mockResolvedValue(null)
})

describe('POST /api/technologies/{name}/components — legacy (name+version)', () => {
  it('should link component by name+version', async () => {
    vi.mocked(technologyService.linkComponent).mockResolvedValue({
      technologyName: 'React', componentName: 'react', componentVersion: '18.2.0'
    })

    const result = await handler(mockEvent({
      method: 'POST',
      params: { name: 'React' },
      body: { componentName: 'react', componentVersion: '18.2.0' }
    }))

    expect(result.success).toBe(true)
    expect(technologyService.linkComponent).toHaveBeenCalledWith(
      expect.objectContaining({ technologyName: 'React', componentName: 'react', componentVersion: '18.2.0' })
    )
  })

  it('should return 400 when componentName and componentVersion are missing (no purl either)', async () => {
    await expect(
      handler(mockEvent({ method: 'POST', params: { name: 'React' }, body: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should return 400 when technology name is missing', async () => {
    await expect(
      handler(mockEvent({ method: 'POST', body: { componentName: 'react', componentVersion: '18.2.0' } }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('POST /api/technologies/{name}/components — PURL-based', () => {
  it('should link component by purl and require superuser', async () => {
    vi.mocked(technologyService.linkComponentByPurl).mockResolvedValue({
      technologyName: 'React', name: 'react', purl: 'pkg:npm/react@18.2.0'
    })

    const result = await handler(mockEvent({
      method: 'POST',
      params: { name: 'React' },
      body: { purl: 'pkg:npm/react@18.2.0' }
    }))

    expect(result.success).toBe(true)
    expect(technologyService.linkComponentByPurl).toHaveBeenCalledWith(
      expect.objectContaining({ technologyName: 'React', purl: 'pkg:npm/react@18.2.0' })
    )
    expect(technologyService.linkComponent).not.toHaveBeenCalled()
  })

  it('should enforce superuser access for purl path', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(
      handler(mockEvent({
        method: 'POST',
        params: { name: 'React' },
        body: { purl: 'pkg:npm/react@18.2.0' }
      }))
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
