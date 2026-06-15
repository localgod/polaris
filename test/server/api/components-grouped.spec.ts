import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/components/grouped.get'
import { componentService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  componentService: { findAllGrouped: vi.fn() }
}))

const mockGroupedComponent = {
  name: 'react',
  group: null,
  packageManager: 'npm',
  versions: ['18.2.0', '19.0.0'],
  versionRange: '18.2.0, 19.0.0',
  versionDetails: [],
  systemCount: 2,
  licenses: [],
  types: ['library'],
  primaryType: 'library',
  purl: 'pkg:npm/react',
  description: null
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/components/grouped', () => {
  it('should return grouped components with count and total', async () => {
    vi.mocked(componentService.findAllGrouped).mockResolvedValue({ data: [mockGroupedComponent], count: 1, total: 1 })

    const result = await handler(mockEvent())

    expect(result).toMatchObject({ success: true, count: 1, total: 1 })
    expect(result.data).toHaveLength(1)
  })

  it('should return 400 on non-numeric limit', async () => {
    const result = await handler(mockEvent({ query: { limit: 'abc' } }))

    expect(result).toMatchObject({ success: false, error: expect.stringContaining('limit') })
  })

  it('should clamp limit to 200 maximum', async () => {
    vi.mocked(componentService.findAllGrouped).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({ query: { limit: '999' } }))

    expect(componentService.findAllGrouped).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }))
  })

  it('should pass the existing component filter surface to the service', async () => {
    vi.mocked(componentService.findAllGrouped).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({
      query: {
        search: 'react',
        packageManager: 'npm',
        type: 'library',
        technology: 'React',
        license: 'MIT',
        hasLicense: 'true',
        system: 'frontend',
        direct: 'true',
        includeDev: 'false',
        depScope: 'runtime',
        sortBy: 'systemCount',
        sortOrder: 'desc'
      }
    }))

    expect(componentService.findAllGrouped).toHaveBeenCalledWith(expect.objectContaining({
      search: 'react',
      packageManager: 'npm',
      type: 'library',
      technology: 'React',
      license: 'MIT',
      hasLicense: true,
      system: 'frontend',
      directOnly: true,
      includeDev: false,
      depScope: 'runtime',
      sortBy: 'systemCount',
      sortOrder: 'desc'
    }))
  })

  it('should drop unsupported grouped sort fields', async () => {
    vi.mocked(componentService.findAllGrouped).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({ query: { sortBy: 'version' } }))

    expect(componentService.findAllGrouped).toHaveBeenCalledWith(expect.objectContaining({ sortBy: undefined }))
  })
})
