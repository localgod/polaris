import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/components/grouped.get'
import { componentService, eolRollupService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  componentService: { findAllGrouped: vi.fn() },
  eolRollupService: {
    getApproaching: vi.fn(),
    getExpired: vi.fn()
  }
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

describe('[pin] GET /api/components/grouped', () => {
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

  it('should filter to component purls from lifecycle risk rollups', async () => {
    vi.mocked(eolRollupService.getApproaching).mockResolvedValue({
      windowDays: 90,
      summary: { components: 1, technologies: 0, systems: 1 },
      items: [{
        kind: 'component',
        key: 'risk-key',
        name: 'node',
        group: null,
        version: '16.20.2',
        packageManager: 'npm',
        purl: 'pkg:npm/node@16.20.2',
        technologyName: 'Node.js',
        systems: [{ name: 'legacy' }],
        systemCount: 1,
        lifecycle: {
          status: 'approaching_eol',
          productName: 'nodejs',
          productLabel: 'Node.js',
          matchedCycle: '16',
          eolDate: '2026-08-01',
          supportEndDate: null,
          daysUntilEOL: 45,
          daysSinceEOL: null,
          lts: true,
          latestVersion: null,
          latestReleaseDate: null,
          source: { name: 'endoflife.date', url: 'https://endoflife.date/nodejs' }
        }
      }]
    })
    vi.mocked(eolRollupService.getExpired).mockResolvedValue({
      windowDays: 90,
      summary: { components: 1, technologies: 0, systems: 1 },
      items: [{
        kind: 'component',
        key: 'expired-key',
        name: 'python',
        group: null,
        version: '3.8.0',
        packageManager: 'pypi',
        purl: 'pkg:pypi/python@3.8.0',
        technologyName: 'Python',
        systems: [{ name: 'legacy' }],
        systemCount: 1,
        lifecycle: {
          status: 'unsupported',
          productName: 'python',
          productLabel: 'Python',
          matchedCycle: '3.8',
          eolDate: '2024-10-07',
          supportEndDate: null,
          daysUntilEOL: null,
          daysSinceEOL: 100,
          lts: null,
          latestVersion: null,
          latestReleaseDate: null,
          source: { name: 'endoflife.date', url: 'https://endoflife.date/python' }
        }
      }]
    })
    vi.mocked(componentService.findAllGrouped).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({ query: { lifecycleRisk: 'true' } }))

    expect(componentService.findAllGrouped).toHaveBeenCalledWith(expect.objectContaining({
      componentPurls: ['pkg:npm/node@16.20.2', 'pkg:pypi/python@3.8.0']
    }))
  })
})
