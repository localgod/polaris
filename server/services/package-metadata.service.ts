import type { Component, PackageAdvisory, PackageMetadata, PackageMetadataUnavailableReason } from '~~/types/api'

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

interface CacheStorage {
  getItem<T>(key: string): Promise<T | null>
  setItem<T>(key: string, value: T): Promise<void>
}

type JsonFetcher = <T>(url: string) => Promise<T>

interface DepsPackageResponse {
  versions?: DepsVersionSummary[]
}

interface DepsVersionSummary {
  versionKey?: {
    version?: string
  }
  publishedAt?: string
  isDefault?: boolean
  isDeprecated?: boolean
  deprecatedReason?: string
}

interface DepsVersionResponse {
  publishedAt?: string
  isDeprecated?: boolean
  deprecatedReason?: string
  licenses?: string[]
  advisoryKeys?: Array<{ id?: string }>
  links?: Array<{ label?: string; url?: string }>
}

export interface ParsedPackagePurl {
  system: string
  packageName: string
  version: string | null
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const RECENT_RELEASE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000
const DEPS_DEV_API_BASE = 'https://api.deps.dev/v3'
const DEPS_DEV_WEB_BASE = 'https://deps.dev'

const SYSTEM_MAP: Record<string, string> = {
  npm: 'npm',
  pypi: 'pypi',
  maven: 'maven',
  cargo: 'cargo',
  golang: 'go',
  go: 'go'
}

export class PackageMetadataService {
  constructor(
    private readonly fetcher: JsonFetcher = fetchJson,
    private readonly storageFactory: () => CacheStorage = () => useStorage('cache:api') as CacheStorage
  ) {}

  async getMetadata(component: Pick<Component, 'purl' | 'version'>): Promise<PackageMetadata> {
    if (!component.purl) {
      return this.unavailable('missing_purl', null, null, component.version || null)
    }

    const parsed = this.parsePurl(component.purl)
    if (!parsed) {
      return this.unavailable('malformed_purl', null, null, component.version || null)
    }

    if (parsed.reason) {
      return this.unavailable(parsed.reason, null, null, parsed.version || component.version || null)
    }

    const currentVersion = parsed.version || component.version || null

    let packageData: DepsPackageResponse
    try {
      packageData = await this.getPackage(parsed.system, parsed.packageName)
    } catch (error) {
      return this.unavailable(this.isNotFound(error) ? 'package_not_found' : 'fetch_failed', parsed.system, parsed.packageName, currentVersion)
    }

    try {
      const versionData = currentVersion
        ? await this.getVersion(parsed.system, parsed.packageName, currentVersion)
        : null
      return this.available(parsed.system, parsed.packageName, currentVersion, packageData, versionData)
    } catch (error) {
      return this.unavailable(this.isNotFound(error) ? 'version_not_found' : 'fetch_failed', parsed.system, parsed.packageName, currentVersion)
    }
  }

  parsePurl(purl: string): (ParsedPackagePurl & { reason?: never }) | { reason: PackageMetadataUnavailableReason; version: string | null } | null {
    const match = /^pkg:([^/]+)\/(.+)$/.exec(purl.trim())
    if (!match) return null

    const type = this.safeDecode(match[1]).toLowerCase()
    const system = SYSTEM_MAP[type]
    const pathWithVersion = match[2].split(/[?#]/, 1)[0]
    if (!pathWithVersion) return null

    const versionIndex = pathWithVersion.lastIndexOf('@')
    const rawPackagePath = versionIndex > 0 ? pathWithVersion.slice(0, versionIndex) : pathWithVersion
    const version = versionIndex > 0 ? this.safeDecode(pathWithVersion.slice(versionIndex + 1)) : null
    const packagePath = this.safeDecode(rawPackagePath)

    if (!system) return { reason: 'unsupported_ecosystem', version }
    if (!packagePath || (versionIndex > 0 && !version)) return null

    const packageName = this.toDepsPackageName(system, packagePath)
    if (!packageName) return null

    return {
      system,
      packageName,
      version
    }
  }

  private async getPackage(system: string, packageName: string): Promise<DepsPackageResponse> {
    const key = `package-metadata:v2:package:${system}:${encodeURIComponent(packageName)}`
    return await this.cached(key, () => this.fetcher<DepsPackageResponse>(this.packageApiUrl(system, packageName)))
  }

  private async getVersion(system: string, packageName: string, version: string): Promise<DepsVersionResponse> {
    const key = `package-metadata:v2:version:${system}:${encodeURIComponent(packageName)}:${encodeURIComponent(version)}`
    return await this.cached(key, () => this.fetcher<DepsVersionResponse>(this.versionApiUrl(system, packageName, version)))
  }

  private async cached<T>(key: string, producer: () => Promise<T>): Promise<T> {
    const storage = this.storageFactory()
    const cached = await storage.getItem<CacheEntry<T>>(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    const value = await producer()
    await storage.setItem(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value
    })
    return value
  }

  private available(
    system: string,
    packageName: string,
    currentVersion: string | null,
    packageData: DepsPackageResponse,
    versionData: DepsVersionResponse | null
  ): PackageMetadata {
    const versions = packageData.versions || []
    const latest = this.latestVersion(versions)
    const defaultVersion = versions.find(version => version.isDefault)?.versionKey?.version || null
    const recentReleases = this.recentReleaseCount(versions)
    const advisories = this.advisories(versionData?.advisoryKeys || [])

    return {
      status: 'available',
      system,
      packageName,
      currentVersion,
      latestVersion: latest?.versionKey?.version || null,
      defaultVersion,
      publishedAt: versionData?.publishedAt || versions.find(version => version.versionKey?.version === currentVersion)?.publishedAt || null,
      isDeprecated: versionData?.isDeprecated ?? versions.find(version => version.versionKey?.version === currentVersion)?.isDeprecated ?? null,
      deprecatedReason: versionData?.deprecatedReason || versions.find(version => version.versionKey?.version === currentVersion)?.deprecatedReason || null,
      licenses: versionData?.licenses || [],
      advisoryCount: advisories.length,
      advisories,
      recentReleases,
      source: {
        name: 'deps.dev',
        url: this.webUrl(system, packageName, currentVersion)
      }
    }
  }

  private unavailable(
    reason: PackageMetadataUnavailableReason,
    system: string | null,
    packageName: string | null,
    currentVersion: string | null
  ): PackageMetadata {
    return {
      status: 'unavailable',
      reason,
      system,
      packageName,
      currentVersion,
      latestVersion: null,
      defaultVersion: null,
      publishedAt: null,
      isDeprecated: null,
      deprecatedReason: null,
      licenses: [],
      advisoryCount: null,
      advisories: [],
      recentReleases: null,
      source: {
        name: 'deps.dev',
        url: system && packageName ? this.webUrl(system, packageName, currentVersion) : null
      }
    }
  }

  private latestVersion(versions: DepsVersionSummary[]): DepsVersionSummary | null {
    return versions.reduce<DepsVersionSummary | null>((latest, version) => {
      const publishedAt = Date.parse(version.publishedAt || '')
      if (Number.isNaN(publishedAt)) return latest
      if (!latest) return version

      const latestPublishedAt = Date.parse(latest.publishedAt || '')
      return Number.isNaN(latestPublishedAt) || publishedAt > latestPublishedAt ? version : latest
    }, null)
  }

  private recentReleaseCount(versions: DepsVersionSummary[]): number {
    const cutoff = Date.now() - RECENT_RELEASE_WINDOW_MS
    return versions.filter((version) => {
      const publishedAt = Date.parse(version.publishedAt || '')
      return !Number.isNaN(publishedAt) && publishedAt >= cutoff
    }).length
  }

  private advisories(advisoryKeys: Array<{ id?: string }>): PackageAdvisory[] {
    return advisoryKeys
      .map(advisory => advisory.id)
      .filter((id): id is string => Boolean(id))
      .map(id => ({
        id,
        url: `https://osv.dev/vulnerability/${encodeURIComponent(id)}`
      }))
  }

  private toDepsPackageName(system: string, packagePath: string): string | null {
    const parts = packagePath.split('/').filter(Boolean)
    if (parts.length === 0) return null

    if (system === 'maven') {
      if (parts.length < 2) return null
      return `${parts.slice(0, -1).join('.')}:${parts.at(-1)}`
    }

    return packagePath
  }

  private isNotFound(error: unknown): boolean {
    const statusCode = typeof error === 'object' && error && 'statusCode' in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : null

    return statusCode === 404
  }

  private packageApiUrl(system: string, packageName: string): string {
    return `${DEPS_DEV_API_BASE}/systems/${system}/packages/${encodeURIComponent(packageName)}`
  }

  private versionApiUrl(system: string, packageName: string, version: string): string {
    return `${this.packageApiUrl(system, packageName)}/versions/${encodeURIComponent(version)}`
  }

  private webUrl(system: string, packageName: string, version: string | null): string {
    const packageUrl = `${DEPS_DEV_WEB_BASE}/${system}/${encodeURIComponent(packageName)}`
    return version ? `${packageUrl}/${encodeURIComponent(version)}` : packageUrl
  }

  private safeDecode(value: string): string {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
}

class FetchJsonError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new FetchJsonError(`Request failed with status ${response.status}`, response.status)
  }
  return await response.json() as T
}
