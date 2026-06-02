import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PackageMetadataService } from '../../../server/services/package-metadata.service'

function createStorage() {
  const cache = new Map<string, unknown>()
  return {
    getItem: vi.fn(async (key: string) => cache.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      cache.set(key, value)
    })
  }
}

const packageResponse = {
  versions: [
    {
      versionKey: { version: '1.0.0' },
      publishedAt: '2024-01-01T00:00:00Z',
      isDefault: false,
      isDeprecated: false,
      deprecatedReason: ''
    },
    {
      versionKey: { version: '1.2.0' },
      publishedAt: '2025-09-23T12:05:06Z',
      isDefault: false,
      isDeprecated: false,
      deprecatedReason: ''
    },
    {
      versionKey: { version: '2.0.0' },
      publishedAt: '2026-05-21T00:00:00Z',
      isDefault: true,
      isDeprecated: false,
      deprecatedReason: ''
    }
  ]
}

const versionResponse = {
  publishedAt: '2025-09-23T12:05:06Z',
  isDeprecated: true,
  deprecatedReason: 'Use 2.x instead.',
  licenses: ['MIT', 'Apache-2.0'],
  advisoryKeys: [{ id: 'GHSA-29mw-wpgm-hmr9' }, { id: 'GHSA-f23m-r3pf-42rh' }]
}

function notFound() {
  return Object.assign(new Error('not found'), { statusCode: 404 })
}

describe('PackageMetadataService', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-02T00:00:00Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses supported package URLs into deps.dev system and package names', () => {
    const service = new PackageMetadataService()

    expect(service.parsePurl('pkg:npm/react@18.2.0')).toEqual({
      system: 'npm',
      packageName: 'react',
      version: '18.2.0'
    })
    expect(service.parsePurl('pkg:npm/@nuxt/ui@4.0.0')).toEqual({
      system: 'npm',
      packageName: '@nuxt/ui',
      version: '4.0.0'
    })
    expect(service.parsePurl('pkg:pypi/Django@5.0.1')).toEqual({
      system: 'pypi',
      packageName: 'Django',
      version: '5.0.1'
    })
    expect(service.parsePurl('pkg:maven/org.springframework/spring-core@6.1.0')).toEqual({
      system: 'maven',
      packageName: 'org.springframework:spring-core',
      version: '6.1.0'
    })
    expect(service.parsePurl('pkg:cargo/serde@1.0.203')).toEqual({
      system: 'cargo',
      packageName: 'serde',
      version: '1.0.203'
    })
    expect(service.parsePurl('pkg:golang/github.com/gorilla/mux@v1.8.1')).toEqual({
      system: 'go',
      packageName: 'github.com/gorilla/mux',
      version: 'v1.8.1'
    })
  })

  it('returns parser failures for unsupported and malformed purls', () => {
    const service = new PackageMetadataService()

    expect(service.parsePurl('pkg:gem/rails@7.1.0')).toEqual({
      reason: 'unsupported_ecosystem',
      version: '7.1.0'
    })
    expect(service.parsePurl('not-a-purl')).toBeNull()
    expect(service.parsePurl('pkg:maven/spring-core@6.1.0')).toBeNull()
  })

  it('fetches package and version data and maps a stable Polaris response', async () => {
    const storage = createStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(packageResponse)
      .mockResolvedValueOnce(versionResponse)
    const service = new PackageMetadataService(fetcher as never, () => storage)

    const metadata = await service.getMetadata({
      purl: 'pkg:npm/@nuxt/ui@1.2.0',
      version: '1.2.0'
    })

    expect(fetcher).toHaveBeenNthCalledWith(1, 'https://api.deps.dev/v3/systems/npm/packages/%40nuxt%2Fui')
    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://api.deps.dev/v3/systems/npm/packages/%40nuxt%2Fui/versions/1.2.0')
    expect(metadata).toMatchObject({
      status: 'available',
      system: 'npm',
      packageName: '@nuxt/ui',
      currentVersion: '1.2.0',
      latestVersion: '2.0.0',
      defaultVersion: '2.0.0',
      publishedAt: '2025-09-23T12:05:06Z',
      isDeprecated: true,
      deprecatedReason: 'Use 2.x instead.',
      licenses: ['MIT', 'Apache-2.0'],
      advisoryCount: 2,
      recentReleases: 2,
      source: {
        name: 'deps.dev',
        url: 'https://deps.dev/npm/%40nuxt%2Fui/1.2.0'
      }
    })
    expect(metadata.advisories).toEqual([
      { id: 'GHSA-29mw-wpgm-hmr9', url: 'https://osv.dev/vulnerability/GHSA-29mw-wpgm-hmr9' },
      { id: 'GHSA-f23m-r3pf-42rh', url: 'https://osv.dev/vulnerability/GHSA-f23m-r3pf-42rh' }
    ])
  })

  it('caches package and version responses for repeated lookups', async () => {
    const storage = createStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(packageResponse)
      .mockResolvedValueOnce(versionResponse)
    const service = new PackageMetadataService(fetcher as never, () => storage)

    await service.getMetadata({ purl: 'pkg:npm/react@1.2.0', version: '1.2.0' })
    await service.getMetadata({ purl: 'pkg:npm/react@1.2.0', version: '1.2.0' })

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('builds canonical deps.dev web links for ordinary npm packages', async () => {
    const storage = createStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(packageResponse)
      .mockResolvedValueOnce({ ...versionResponse, isDeprecated: false, deprecatedReason: '' })
    const service = new PackageMetadataService(fetcher as never, () => storage)

    const metadata = await service.getMetadata({
      purl: 'pkg:npm/nuxt@4.4.6',
      version: '4.4.6'
    })

    expect(metadata).toMatchObject({
      status: 'available',
      system: 'npm',
      packageName: 'nuxt',
      currentVersion: '4.4.6',
      source: {
        name: 'deps.dev',
        url: 'https://deps.dev/npm/nuxt/4.4.6'
      }
    })
    expect(storage.setItem).toHaveBeenNthCalledWith(1, 'package-metadata:v2:package:npm:nuxt', expect.any(Object))
    expect(storage.setItem).toHaveBeenNthCalledWith(2, 'package-metadata:v2:version:npm:nuxt:4.4.6', expect.any(Object))
  })

  it('returns unavailable when package metadata cannot be looked up', async () => {
    const storage = createStorage()
    const service = new PackageMetadataService(vi.fn(async () => {
      throw notFound()
    }) as never, () => storage)

    const metadata = await service.getMetadata({ purl: 'pkg:npm/missing@1.0.0', version: '1.0.0' })

    expect(metadata).toMatchObject({
      status: 'unavailable',
      reason: 'package_not_found',
      system: 'npm',
      packageName: 'missing',
      currentVersion: '1.0.0'
    })
  })

  it('returns unavailable when selected version metadata cannot be looked up', async () => {
    const storage = createStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(packageResponse)
      .mockRejectedValueOnce(notFound())
    const service = new PackageMetadataService(fetcher as never, () => storage)

    const metadata = await service.getMetadata({ purl: 'pkg:npm/react@9.9.9', version: '9.9.9' })

    expect(metadata).toMatchObject({
      status: 'unavailable',
      reason: 'version_not_found',
      system: 'npm',
      packageName: 'react',
      currentVersion: '9.9.9'
    })
  })

  it('returns unavailable for missing purl, unsupported ecosystem, and upstream failures', async () => {
    const storage = createStorage()
    const service = new PackageMetadataService(vi.fn(async () => {
      throw new Error('network unavailable')
    }) as never, () => storage)

    await expect(service.getMetadata({ purl: null, version: '1.0.0' })).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'missing_purl'
    })
    await expect(service.getMetadata({ purl: 'pkg:gem/rails@7.1.0', version: '7.1.0' })).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'unsupported_ecosystem'
    })
    await expect(service.getMetadata({ purl: 'pkg:npm/react@18.2.0', version: '18.2.0' })).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'fetch_failed'
    })
  })
})
