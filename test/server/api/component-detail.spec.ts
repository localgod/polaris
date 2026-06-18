import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import { encodeComponentKey } from '../../../utils/component-identity'
import handler from '../../../server/api/components/[key].get'
import eolHandler from '../../../server/api/components/eol.get'
import { componentService, eolService, packageMetadataService, securityScoreService, vulnerabilityService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  componentService: { findByIdentity: vi.fn() },
  eolService: { getEOLStatus: vi.fn() },
  packageMetadataService: { getMetadata: vi.fn() },
  securityScoreService: { getScore: vi.fn() },
  vulnerabilityService: { getVulnerabilities: vi.fn() }
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
  externalReferences: [{ type: 'vcs', url: 'https://github.com/nodejs/node' }],
  description: null,
  releaseDate: null,
  publishedDate: null,
  modifiedDate: null,
  technologyName: 'Node.js',
  systemCount: 1,
  systems: [{ name: 'catalog', scope: 'runtime', isDirect: true }],
  directDependencies: [
    {
      name: 'semver',
      group: null,
      version: '7.6.3',
      packageManager: 'npm',
      purl: 'pkg:npm/semver@7.6.3',
      scope: 'runtime',
      isDirect: true
    }
  ],
  eol: null,
  packageMetadata: null,
  maintenanceHealth: null,
  securityScorecard: null,
  vulnerabilities: null
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

const mockSecurityScorecard = {
  status: 'available' as const,
  repository: {
    host: 'github.com' as const,
    owner: 'nodejs',
    name: 'node',
    url: 'https://github.com/nodejs/node'
  },
  score: 8.5,
  checks: [
    { name: 'Code-Review', score: 9, reason: 'Found pull request reviews.' }
  ],
  scannedAt: '2026-05-30',
  source: { name: 'OpenSSF Scorecard' as const, url: 'https://scorecard.dev/viewer/?uri=github.com/nodejs/node' }
}

const mockVulnerabilities = {
  status: 'available' as const,
  vulnerabilities: [
    {
      id: 'GHSA-xxxx-yyyy-zzzz',
      aliases: ['CVE-2026-1234'],
      summary: 'Example vulnerability',
      severity: { type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', cvssScore: 9.8 },
      affectedRanges: ['all versions before 24.16.1'],
      advisoryUrl: 'https://osv.dev/vulnerability/GHSA-xxxx-yyyy-zzzz',
      publishedAt: '2026-05-01T00:00:00Z',
      modifiedAt: '2026-05-02T00:00:00Z'
    }
  ],
  source: { name: 'OSV.dev' as const, url: 'https://osv.dev/list?q=pkg%3Anpm%2Fnode%4024.16.0' }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/components/{key}', () => {
  it('returns component details with read-only enrichment', async () => {
    vi.mocked(componentService.findByIdentity).mockResolvedValue(mockComponent)
    vi.mocked(eolService.getEOLStatus).mockResolvedValue(mockEol)
    vi.mocked(packageMetadataService.getMetadata).mockResolvedValue(mockPackageMetadata)
    vi.mocked(securityScoreService.getScore).mockResolvedValue(mockSecurityScorecard)
    vi.mocked(vulnerabilityService.getVulnerabilities).mockResolvedValue(mockVulnerabilities)

    const key = encodeComponentKey(mockComponent)
    const result = await handler(mockEvent({ params: { key } }))

    expect(componentService.findByIdentity).toHaveBeenCalledWith({ purl: 'pkg:npm/node@24.16.0' })
    expect(eolService.getEOLStatus).toHaveBeenCalledWith(mockComponent)
    expect(packageMetadataService.getMetadata).toHaveBeenCalledWith(mockComponent)
    expect(securityScoreService.getScore).toHaveBeenCalledWith(mockComponent)
    expect(vulnerabilityService.getVulnerabilities).toHaveBeenCalledWith(mockComponent)
    expect(result).toMatchObject({
      success: true,
      data: {
        name: 'node',
        directDependencies: mockComponent.directDependencies,
        eol: mockEol,
        packageMetadata: mockPackageMetadata,
        maintenanceHealth: {
          status: 'stable',
          updateType: 'minor',
          reasonCodes: expect.arrayContaining(['minor_update_available'])
        },
        securityScorecard: mockSecurityScorecard,
        vulnerabilities: mockVulnerabilities
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
    vi.mocked(securityScoreService.getScore).mockResolvedValue(mockSecurityScorecard)
    vi.mocked(vulnerabilityService.getVulnerabilities).mockResolvedValue(mockVulnerabilities)

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
        },
        maintenanceHealth: {
          status: 'unknown',
          reasonCodes: expect.arrayContaining(['metadata_unavailable', 'missing_release_date', 'update_status_unknown'])
        },
        securityScorecard: mockSecurityScorecard,
        vulnerabilities: mockVulnerabilities
      }
    })
  })

  it('does not fail component details when security scorecard enrichment throws', async () => {
    vi.mocked(componentService.findByIdentity).mockResolvedValue(mockComponent)
    vi.mocked(eolService.getEOLStatus).mockResolvedValue(mockEol)
    vi.mocked(packageMetadataService.getMetadata).mockResolvedValue(mockPackageMetadata)
    vi.mocked(securityScoreService.getScore).mockRejectedValue(new Error('scorecard unavailable'))
    vi.mocked(vulnerabilityService.getVulnerabilities).mockResolvedValue(mockVulnerabilities)

    const key = encodeComponentKey(mockComponent)
    const result = await handler(mockEvent({ params: { key } }))

    expect(result).toMatchObject({
      success: true,
      data: {
        name: 'node',
        eol: mockEol,
        packageMetadata: mockPackageMetadata,
        maintenanceHealth: {
          status: 'stable'
        },
        securityScorecard: {
          status: 'unavailable',
          reason: 'fetch_failed',
          score: null,
          checks: []
        },
        vulnerabilities: mockVulnerabilities
      }
    })
  })

  it('does not fail component details when vulnerability enrichment throws', async () => {
    vi.mocked(componentService.findByIdentity).mockResolvedValue(mockComponent)
    vi.mocked(eolService.getEOLStatus).mockResolvedValue(mockEol)
    vi.mocked(packageMetadataService.getMetadata).mockResolvedValue(mockPackageMetadata)
    vi.mocked(securityScoreService.getScore).mockResolvedValue(mockSecurityScorecard)
    vi.mocked(vulnerabilityService.getVulnerabilities).mockRejectedValue(new Error('osv unavailable'))

    const key = encodeComponentKey(mockComponent)
    const result = await handler(mockEvent({ params: { key } }))

    expect(result).toMatchObject({
      success: true,
      data: {
        name: 'node',
        vulnerabilities: {
          status: 'unavailable',
          reason: 'fetch_failed',
          vulnerabilities: [],
          source: {
            name: 'OSV.dev',
            url: null
          }
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
