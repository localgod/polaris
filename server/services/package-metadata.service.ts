import type { Component, PackageAdvisory, PackageMetadata, PackageMetadataSource, PackageMetadataUnavailableReason } from '~~/types/api'
import { logger } from '../utils/logger'

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

interface NpmVersionResponse {
  deprecated?: string
  license?: string
  licenses?: Array<{ type?: string } | string> | string
}

interface NpmPackageResponse {
  'dist-tags'?: {
    latest?: string
  }
  time?: Record<string, string>
  versions?: Record<string, NpmVersionResponse>
}

interface PyPIPackageResponse {
  info?: {
    version?: string
    license?: string
    classifiers?: string[]
  }
  releases?: Record<string, Array<{
    upload_time_iso_8601?: string
    yanked?: boolean
    yanked_reason?: string
  }>>
}

interface MavenSearchResponse {
  response?: {
    docs?: Array<{
      g?: string
      a?: string
      latestVersion?: string
      timestamp?: number
    }>
  }
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
const NPM_REGISTRY_BASE = 'https://registry.npmjs.org'
const NPM_WEB_BASE = 'https://www.npmjs.com/package'
const PYPI_API_BASE = 'https://pypi.org/pypi'
const PYPI_WEB_BASE = 'https://pypi.org/project'
const MAVEN_SEARCH_API = 'https://search.maven.org/solrsearch/select'
const MAVEN_SEARCH_WEB = 'https://search.maven.org/search'

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
      return await this.fallbackOrUnavailable(
        this.isNotFound(error) ? 'package_not_found' : 'fetch_failed',
        parsed.system,
        parsed.packageName,
        currentVersion
      )
    }

    try {
      const versionData = currentVersion
        ? await this.getVersion(parsed.system, parsed.packageName, currentVersion)
        : null
      const metadata = this.available(parsed.system, parsed.packageName, currentVersion, packageData, versionData)
      if (this.isIncomplete(metadata)) {
        return await this.fallbackOrMetadata(metadata, parsed.system, parsed.packageName, currentVersion)
      }
      return metadata
    } catch (error) {
      return await this.fallbackOrUnavailable(
        this.isNotFound(error) ? 'version_not_found' : 'fetch_failed',
        parsed.system,
        parsed.packageName,
        currentVersion
      )
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

  private async fallbackOrMetadata(
    metadata: PackageMetadata,
    system: string,
    packageName: string,
    currentVersion: string | null
  ): Promise<PackageMetadata> {
    try {
      return await this.getNativeMetadata(system, packageName, currentVersion)
    } catch (error) {
      logger.warn({
        err: error,
        system,
        packageName,
        currentVersion
      }, 'Native package metadata fallback failed; returning deps.dev metadata')
      return metadata
    }
  }

  private async fallbackOrUnavailable(
    reason: PackageMetadataUnavailableReason,
    system: string,
    packageName: string,
    currentVersion: string | null
  ): Promise<PackageMetadata> {
    try {
      return await this.getNativeMetadata(system, packageName, currentVersion)
    } catch (error) {
      logger.warn({
        err: error,
        system,
        packageName,
        currentVersion,
        reason
      }, 'Native package metadata fallback failed; returning unavailable metadata')
      return this.unavailable(reason, system, packageName, currentVersion)
    }
  }

  private async getNativeMetadata(
    system: string,
    packageName: string,
    currentVersion: string | null
  ): Promise<PackageMetadata> {
    const key = `package-metadata:v2:native:${system}:${encodeURIComponent(packageName)}:${encodeURIComponent(currentVersion || '_')}`
    return await this.cached(key, async () => {
      switch (system) {
        case 'npm':
          return await this.getNpmMetadata(packageName, currentVersion)
        case 'pypi':
          return await this.getPyPIMetadata(packageName, currentVersion)
        case 'maven':
          return await this.getMavenMetadata(packageName, currentVersion)
        default:
          throw new Error(`Unsupported native registry system: ${system}`)
      }
    })
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

  private nativeAvailable(input: {
    source: PackageMetadataSource
    system: string
    packageName: string
    currentVersion: string | null
    latestVersion: string | null
    defaultVersion?: string | null
    publishedAt?: string | null
    isDeprecated?: boolean | null
    deprecatedReason?: string | null
    licenses?: string[]
    recentReleases?: number | null
    url: string | null
  }): PackageMetadata {
    return {
      status: 'available',
      system: input.system,
      packageName: input.packageName,
      currentVersion: input.currentVersion,
      latestVersion: input.latestVersion,
      defaultVersion: input.defaultVersion ?? input.latestVersion,
      publishedAt: input.publishedAt ?? null,
      isDeprecated: input.isDeprecated ?? null,
      deprecatedReason: input.deprecatedReason ?? null,
      licenses: input.licenses ?? [],
      advisoryCount: null,
      advisories: [],
      recentReleases: input.recentReleases ?? null,
      source: {
        name: input.source,
        url: input.url
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

  private recentReleaseCountFromDates(dates: string[]): number {
    const cutoff = Date.now() - RECENT_RELEASE_WINDOW_MS
    return dates.filter((date) => {
      const publishedAt = Date.parse(date)
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

  private isIncomplete(metadata: PackageMetadata): boolean {
    return metadata.status === 'available'
      && (
        !metadata.latestVersion
        || (Boolean(metadata.currentVersion) && metadata.publishedAt === null && metadata.isDeprecated === null)
      )
  }

  private async getNpmMetadata(packageName: string, currentVersion: string | null): Promise<PackageMetadata> {
    const data = await this.fetcher<NpmPackageResponse>(`${NPM_REGISTRY_BASE}/${encodeURIComponent(packageName)}`)
    const latestVersion = data['dist-tags']?.latest || null
    const selectedVersion = currentVersion || latestVersion
    const versionData = selectedVersion ? data.versions?.[selectedVersion] : undefined
    const deprecatedReason = typeof versionData?.deprecated === 'string' && versionData.deprecated.trim()
      ? versionData.deprecated
      : null
    const publishDates = Object.entries(data.time || {})
      .filter(([key]) => key !== 'created' && key !== 'modified')
      .map(([, value]) => value)

    return this.nativeAvailable({
      source: 'npm',
      system: 'npm',
      packageName,
      currentVersion,
      latestVersion,
      defaultVersion: latestVersion,
      publishedAt: selectedVersion ? data.time?.[selectedVersion] || null : data.time?.modified || null,
      isDeprecated: deprecatedReason !== null,
      deprecatedReason,
      licenses: this.npmLicenses(versionData),
      recentReleases: this.recentReleaseCountFromDates(publishDates),
      url: `${NPM_WEB_BASE}/${packageName}`
    })
  }

  private async getPyPIMetadata(packageName: string, currentVersion: string | null): Promise<PackageMetadata> {
    const data = await this.fetcher<PyPIPackageResponse>(`${PYPI_API_BASE}/${encodeURIComponent(packageName)}/json`)
    const latestVersion = data.info?.version || null
    const selectedVersion = currentVersion || latestVersion
    const releaseFiles = selectedVersion ? data.releases?.[selectedVersion] || [] : []
    const yankedFiles = releaseFiles.filter(file => file.yanked)
    const isDeprecated = releaseFiles.length > 0 ? yankedFiles.length === releaseFiles.length : null
    const deprecatedReason = yankedFiles.map(file => file.yanked_reason).find(Boolean) || null
    const releaseDates = Object.values(data.releases || {})
      .flat()
      .map(file => file.upload_time_iso_8601)
      .filter((date): date is string => Boolean(date))

    return this.nativeAvailable({
      source: 'pypi',
      system: 'pypi',
      packageName,
      currentVersion,
      latestVersion,
      defaultVersion: latestVersion,
      publishedAt: this.firstReleaseUploadTime(releaseFiles),
      isDeprecated,
      deprecatedReason,
      licenses: this.pypiLicenses(data),
      recentReleases: this.recentReleaseCountFromDates(releaseDates),
      url: `${PYPI_WEB_BASE}/${encodeURIComponent(packageName)}/`
    })
  }

  private async getMavenMetadata(packageName: string, currentVersion: string | null): Promise<PackageMetadata> {
    const coordinates = this.mavenCoordinates(packageName)
    if (!coordinates) {
      throw new Error(`Invalid Maven coordinates: ${packageName}`)
    }

    const group = this.escapeSolrPhrase(coordinates.group)
    const artifact = this.escapeSolrPhrase(coordinates.artifact)
    const query = `g:"${group}" AND a:"${artifact}"`
    const params = new URLSearchParams({
      q: query,
      rows: '1',
      wt: 'json'
    })
    const data = await this.fetcher<MavenSearchResponse>(`${MAVEN_SEARCH_API}?${params.toString()}`)
    const doc = data.response?.docs?.[0]
    if (!doc?.latestVersion) {
      throw new Error(`Maven metadata not found for ${packageName}`)
    }

    const timestamp = typeof doc.timestamp === 'number' ? new Date(doc.timestamp).toISOString() : null
    return this.nativeAvailable({
      source: 'maven',
      system: 'maven',
      packageName,
      currentVersion,
      latestVersion: doc.latestVersion,
      defaultVersion: doc.latestVersion,
      publishedAt: currentVersion === doc.latestVersion ? timestamp : null,
      isDeprecated: null,
      deprecatedReason: null,
      licenses: [],
      recentReleases: null,
      url: `${MAVEN_SEARCH_WEB}?${new URLSearchParams({ q: query }).toString()}`
    })
  }

  private npmLicenses(versionData: NpmVersionResponse | undefined): string[] {
    if (!versionData) return []

    if (typeof versionData.license === 'string' && versionData.license.trim()) {
      return [versionData.license]
    }

    if (typeof versionData.licenses === 'string' && versionData.licenses.trim()) {
      return [versionData.licenses]
    }

    if (Array.isArray(versionData.licenses)) {
      return versionData.licenses
        .map(license => typeof license === 'string' ? license : license.type)
        .filter((license): license is string => Boolean(license))
    }

    return []
  }

  private pypiLicenses(data: PyPIPackageResponse): string[] {
    const license = data.info?.license?.trim()
    if (license) return [license]

    return (data.info?.classifiers || [])
      .filter(classifier => classifier.startsWith('License :: '))
      .map(classifier => classifier.split(' :: ').at(-1))
      .filter((classifier): classifier is string => Boolean(classifier))
  }

  private firstReleaseUploadTime(files: Array<{ upload_time_iso_8601?: string }>): string | null {
    return files
      .map(file => file.upload_time_iso_8601)
      .filter((date): date is string => Boolean(date) && !Number.isNaN(Date.parse(date)))
      .sort((a, b) => Date.parse(a) - Date.parse(b))
      .at(0) || null
  }

  private mavenCoordinates(packageName: string): { group: string; artifact: string } | null {
    const separatorIndex = packageName.indexOf(':')
    if (separatorIndex <= 0 || separatorIndex === packageName.length - 1) {
      return null
    }

    return {
      group: packageName.slice(0, separatorIndex),
      artifact: packageName.slice(separatorIndex + 1)
    }
  }

  private escapeSolrPhrase(value: string): string {
    return value.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1')
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
