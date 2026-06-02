import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import { encodeComponentKey } from '../../../utils/component-identity'
import handler from '../../../server/api/components/[key].get'
import eolHandler from '../../../server/api/components/eol.get'
import { componentService, eolService, packageMetadataService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  componentService: { findByIdentity: vi.fn() },
  eolService: { getEOLStatus: vi.fn() },
  packageMetadataService: { getMetadata: vi.fn() }
}))

const mockComponent = {
  name: 'node',
  version: '24.16.0',
  packageManager: 'npm',
  purl: 'pkg:npm/node@24.16.0',
  cpe: null,
  bomRef: null,
  type: 'library',
  group: null,
  scope: null,
  isDirect: null,
  hashes: [],
  licenses: [],
  copyright: null,
  supplier: null,
  author: null,
  publisher: null,
  homepage: null,
  externalReferences: [],
  description: null,
  releaseDate: null,
  publishedDate: null,
  modifiedDate: null,
  technologyName: 'Node.js',
  systemCount: 1,
  systems: [{ name: 'catalog', scope: 'runtime', isDirect: true }],
  eol: null,
  packageMetadata: null
}

const mockEol = {
  status: 'active' as const,
  productName: 'nodejs',
  productLabel: 'Node.js',
  matchedCycle: '24',
  eolDate: '2028-04-30',
  supportEndDate: '2026-10-20',
  lts: true,
  latestVersion: '24.16.0',
  latestReleaseDate: '2026-05-21',
  source: { name: 'endoflife.date' as const, url: 'https://endoflife.date/nodejs' }
}

const mockPackageMetadata = {
  status: 'available' as const,
  system: 'npm',
  packageName: 'node',
  currentVersion: '24.16.0',
  latestVersion: '24.17.0',
  defaultVersion: '24.17.0',
  publishedAt: '2026-05-21T00:00:00Z',
  isDeprecated: false,
  deprecatedReason: null,
  licenses: ['MIT'],
  advisoryCount: 0,
  advisories: [],
  recentReleases: 3,
  source: { name: 'deps.dev' as const, url: 'https://deps.dev/npm/node/24.16.0' }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/components/{key}', () => {
  it('returns component details with read-only enrichment', async () => {
    vi.mocked(componentService.findByIdentity).mockResolvedValue(mockComponent)
    vi.mocked(eolService.getEOLStatus).mockResolvedValue(mockEol)
    vi.mocked(packageMetadataService.getMetadata).mockResolvedValue(mockPackageMetadata)

    const key = encodeComponentKey(mockComponent)
    const result = await handler(mockEvent({ params: { key } }))

    expect(componentService.findByIdentity).toHaveBeenCalledWith({ purl: 'pkg:npm/node@24.16.0' })
    expect(eolService.getEOLStatus).toHaveBeenCalledWith(mockComponent)
    expect(packageMetadataService.getMetadata).toHaveBeenCalledWith(mockComponent)
    expect(result).toMatchObject({
      success: true,
      data: {
        name: 'node',
        eol: mockEol,
        packageMetadata: mockPackageMetadata
      }
    })
  })

  it('rejects malformed component keys', async () => {
    await expect(handler(mockEvent({ params: { key: 'invalid' } }))).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('does not fail component details when package metadata enrichment throws', async () => {
    vi.mocked(componentService.findByIdentity).mockResolvedValue(mockComponent)
    vi.mocked(eolService.getEOLStatus).mockResolvedValue(mockEol)
    vi.mocked(packageMetadataService.getMetadata).mockRejectedValue(new Error('deps.dev unavailable'))

    const key = encodeComponentKey(mockComponent)
    const result = await handler(mockEvent({ params: { key } }))

    expect(result).toMatchObject({
      success: true,
      data: {
        name: 'node',
        eol: mockEol,
        packageMetadata: {
          status: 'unavailable',
          reason: 'fetch_failed',
          currentVersion: '24.16.0'
        }
      }
    })
  })
})

describe('GET /api/components/eol', () => {
  it('requires component name and version', async () => {
    const result = await eolHandler(mockEvent({ query: { name: 'node' } }))

    expect(result).toMatchObject({
      success: false,
      error: 'name and version are required'
    })
  })

  it('returns EOL status for valid query parameters', async () => {
    vi.mocked(eolService.getEOLStatus).mockResolvedValue(mockEol)

    const result = await eolHandler(mockEvent({
      query: {
        name: 'node',
        version: '24.16.0',
        packageManager: 'npm',
        technologyName: 'Node.js'
      }
    }))

    expect(eolService.getEOLStatus).toHaveBeenCalledWith(expect.objectContaining({
      name: 'node',
      version: '24.16.0',
      packageManager: 'npm',
      technologyName: 'Node.js'
    }))
    expect(result).toMatchObject({
      success: true,
      data: mockEol
    })
  })
})
