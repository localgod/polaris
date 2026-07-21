import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import linkSuggestionsHandler from '../../../server/api/components/link-suggestions.get'
import dismissLinkHandler from '../../../server/api/components/dismiss-link.post'
import { componentService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  componentService: {
    getLinkSuggestions: vi.fn(),
    dismissLink: vi.fn()
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

const mockSuggestion = {
  purl: 'pkg:npm/react@18.2.0',
  name: 'react',
  packageManager: 'npm',
  purlName: 'react',
  suggestedTechnologies: ['React'],
  hasExactMatch: true
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireSuperuser.mockResolvedValue(superuser)
})

describe('[contract] GET /api/components/link-suggestions', () => {
  it('should return suggestions with count and total', async () => {
    vi.mocked(componentService.getLinkSuggestions).mockResolvedValue({
      data: [mockSuggestion], count: 1, total: 1
    })

    const result = await linkSuggestionsHandler(mockEvent())

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('should pass skip and limit query params to service', async () => {
    vi.mocked(componentService.getLinkSuggestions).mockResolvedValue({ data: [], count: 0, total: 0 })

    await linkSuggestionsHandler(mockEvent({ query: { skip: '50', limit: '25' } }))

    expect(componentService.getLinkSuggestions).toHaveBeenCalledWith(50, 25, undefined)
  })

  it('should clamp limit to 200 maximum', async () => {
    vi.mocked(componentService.getLinkSuggestions).mockResolvedValue({ data: [], count: 0, total: 0 })

    await linkSuggestionsHandler(mockEvent({ query: { limit: '999' } }))

    expect(componentService.getLinkSuggestions).toHaveBeenCalledWith(0, 200, undefined)
  })

  it('should clamp skip to 0 minimum', async () => {
    vi.mocked(componentService.getLinkSuggestions).mockResolvedValue({ data: [], count: 0, total: 0 })

    await linkSuggestionsHandler(mockEvent({ query: { skip: '-10' } }))

    expect(componentService.getLinkSuggestions).toHaveBeenCalledWith(0, 50, undefined)
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(linkSuggestionsHandler(mockEvent())).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('[contract] POST /api/components/dismiss-link', () => {
  it('should dismiss a component by componentName and return 204', async () => {
    vi.mocked(componentService.dismissLink).mockResolvedValue(undefined)

    const result = await dismissLinkHandler(mockEvent({
      method: 'POST',
      body: { componentName: 'react' }
    }))

    expect(result).toBeNull()
    expect(componentService.dismissLink).toHaveBeenCalledWith('react')
  })

  it('should return 400 when componentName is missing', async () => {
    await expect(
      dismissLinkHandler(mockEvent({ method: 'POST', body: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should enforce superuser access', async () => {
    mockRequireSuperuser.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

    await expect(
      dismissLinkHandler(mockEvent({ method: 'POST', body: { componentName: 'react' } }))
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
