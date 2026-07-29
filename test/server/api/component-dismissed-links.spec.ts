import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import dismissedLinksHandler from '../../../server/api/components/dismissed-links.get'
import undismissLinkHandler from '../../../server/api/components/undismiss-link.post'
import { componentService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  componentService: {
    getDismissedLinks: vi.fn(),
    undismissLink: vi.fn()
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

const mockDismissed = {
  name: 'left-pad',
  group: null,
  packageManager: 'npm',
  description: null,
  purl: 'pkg:npm/left-pad@1.3.0',
  dismissedAt: '2026-07-20T12:00:00Z'
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireSuperuser.mockResolvedValue(superuser)
})

describe('[contract] GET /api/components/dismissed-links', () => {
  it('should return dismissed components with count and total', async () => {
    vi.mocked(componentService.getDismissedLinks).mockResolvedValue({
      data: [mockDismissed], count: 1, total: 1
    })

    const result = await dismissedLinksHandler(mockEvent())

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('should pass skip and limit query params to service', async () => {
    vi.mocked(componentService.getDismissedLinks).mockResolvedValue({ data: [], count: 0, total: 0 })

    await dismissedLinksHandler(mockEvent({ query: { skip: '50', limit: '25' } }))

    expect(componentService.getDismissedLinks).toHaveBeenCalledWith(50, 25, undefined)
  })

  it('should clamp limit to 200 maximum', async () => {
    vi.mocked(componentService.getDismissedLinks).mockResolvedValue({ data: [], count: 0, total: 0 })

    await dismissedLinksHandler(mockEvent({ query: { limit: '999' } }))

    expect(componentService.getDismissedLinks).toHaveBeenCalledWith(0, 200, undefined)
  })

  it('should clamp skip to 0 minimum', async () => {
    vi.mocked(componentService.getDismissedLinks).mockResolvedValue({ data: [], count: 0, total: 0 })

    await dismissedLinksHandler(mockEvent({ query: { skip: '-10' } }))

    expect(componentService.getDismissedLinks).toHaveBeenCalledWith(0, 50, undefined)
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(dismissedLinksHandler(mockEvent())).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('[contract] POST /api/components/undismiss-link', () => {
  it('should restore a component by componentName and return 204', async () => {
    vi.mocked(componentService.undismissLink).mockResolvedValue(undefined)

    const result = await undismissLinkHandler(mockEvent({
      method: 'POST',
      body: { componentName: 'left-pad' }
    }))

    expect(result).toBeNull()
    expect(componentService.undismissLink).toHaveBeenCalledWith({ name: 'left-pad', group: null, packageManager: null })
  })

  it('should pass componentGroup and componentPackageManager through to disambiguate components sharing a bare name', async () => {
    vi.mocked(componentService.undismissLink).mockResolvedValue(undefined)

    await undismissLinkHandler(mockEvent({
      method: 'POST',
      body: { componentName: 'ui', componentGroup: '@nuxt', componentPackageManager: 'npm' }
    }))

    expect(componentService.undismissLink).toHaveBeenCalledWith({ name: 'ui', group: '@nuxt', packageManager: 'npm' })
  })

  it('should return 400 when componentName is missing', async () => {
    await expect(
      undismissLinkHandler(mockEvent({ method: 'POST', body: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(
      undismissLinkHandler(mockEvent({ method: 'POST', body: { componentName: 'left-pad' } }))
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
