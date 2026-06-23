import type { EOLStatus, EOLStatusValue } from '~~/types/api'
import { logger } from '../utils/logger'

export interface EOLStatusInput {
  name: string
  version: string
  packageManager?: string | null
  group?: string | null
  purl?: string | null
  technologyName?: string | null
}

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

interface CacheStorage {
  getItem<T>(key: string): Promise<T | null>
  setItem<T>(key: string, value: T): Promise<void>
}

type JsonFetcher = <T>(url: string) => Promise<T>

interface EOLProductResponse {
  result?: EOLProduct
}

interface EOLProduct {
  name: string
  label?: string
  links?: {
    html?: string
  }
  releases?: EOLRelease[]
}

interface EOLRelease {
  name: string
  label?: string
  releaseDate?: string | null
  isLts?: boolean | null
  ltsFrom?: string | null
  isEoas?: boolean | null
  eoasFrom?: string | null
  isEol?: boolean | null
  eolFrom?: string | null
  isMaintained?: boolean | null
  latest?: {
    name?: string
    date?: string
    link?: string
  } | null
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_APPROACHING_EOL_DAYS = 90

const PRODUCT_ALIASES: Record<string, string> = {
  '@types/node': 'nodejs',
  node: 'nodejs',
  'node.js': 'nodejs',
  nodejs: 'nodejs',
  python: 'python',
  django: 'django',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  pg: 'postgresql',
  redis: 'redis',
  react: 'react',
  vue: 'vue',
  'vue.js': 'vue',
  angular: 'angular',
  nuxt: 'nuxt',
  next: 'nextjs',
  nextjs: 'nextjs',
  'next.js': 'nextjs',
  ruby: 'ruby',
  rails: 'rails',
  go: 'go',
  golang: 'go',
  dotnet: 'dotnet',
  '.net': 'dotnet',
  php: 'php',
  java: 'java',
  maven: 'maven',
  gradle: 'gradle',
  mysql: 'mysql',
  mariadb: 'mariadb',
  mongodb: 'mongodb',
  elasticsearch: 'elasticsearch',
  kubernetes: 'kubernetes',
  k8s: 'kubernetes',
  docker: 'docker-engine',
  nginx: 'nginx'
}

export class EOLService {
  constructor(
    private readonly fetcher: JsonFetcher = fetchJson,
    private readonly storageFactory: () => CacheStorage = () => useStorage('cache:api') as CacheStorage
  ) {}

  async getEOLStatus(input: EOLStatusInput): Promise<EOLStatus> {
    const productName = this.resolveProductName(input)
    if (!productName) {
      return this.unknown('no_mapping', null, null)
    }

    try {
      const product = await this.getProduct(productName)
      if (!product) {
        return this.unknown('no_data', productName, null)
      }

      const release = this.findMatchingRelease(product.releases || [], input.version)
      if (!release) {
        return this.unknown('no_matching_cycle', product.name, product)
      }

      return this.toStatus(product, release)
    } catch (error) {
      logger.warn({ err: error, productName }, 'EOL fetch failed')
      return this.unknown('fetch_failed', productName, null)
    }
  }

  resolveProductName(input: EOLStatusInput): string | null {
    const candidates = [
      input.technologyName,
      ...this.purlCandidates(input.purl),
      input.group ? `${input.group}/${input.name}` : null,
      input.name
    ]

    for (const candidate of candidates) {
      const product = this.normalizeProductCandidate(candidate)
      if (product) return product
    }

    return null
  }

  private async getProduct(productName: string): Promise<EOLProduct | null> {
    const key = `eol:v1:product:${productName}`
    const storage = this.storageFactory()
    const cached = await storage.getItem<CacheEntry<EOLProduct | null>>(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    const data = await this.fetcher<EOLProductResponse>(
      `https://endoflife.date/api/v1/products/${encodeURIComponent(productName)}/`
    )
    const product = data.result || null
    await storage.setItem(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: product
    })
    return product
  }

  private purlCandidates(purl?: string | null): Array<string | null> {
    if (!purl) return []

    const match = /^pkg:([^/]+)\/(.+?)(?:@[^@]+)?(?:[?#].*)?$/.exec(purl)
    if (!match) return []

    const type = decodeURIComponent(match[1])
    const path = decodeURIComponent(match[2])
    const parts = path.split('/').filter(Boolean)
    const name = parts.at(-1) || null
    const namespace = parts.length > 1 ? parts.slice(0, -1).join('/') : null

    return [
      namespace && name ? `${namespace}/${name}` : null,
      name,
      type === 'docker' && namespace === 'library' ? name : null
    ]
  }

  private normalizeProductCandidate(candidate?: string | null): string | null {
    if (!candidate) return null
    const normalized = candidate
      .trim()
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/^types\//, '@types/')
      .replaceAll('_', '-')
      .replace(/\s+/g, '-')

    if (!normalized) return null
    if (PRODUCT_ALIASES[normalized]) return PRODUCT_ALIASES[normalized]

    const unscoped = normalized.split('/').at(-1) || normalized
    if (PRODUCT_ALIASES[unscoped]) return PRODUCT_ALIASES[unscoped]

    return unscoped.replace(/[^a-z0-9.-]/g, '-')
  }

  private findMatchingRelease(releases: EOLRelease[], version: string): EOLRelease | null {
    const candidates = this.releaseCycleCandidates(version)
    return releases.find(release => candidates.includes(release.name.toLowerCase())) || null
  }

  private releaseCycleCandidates(version: string): string[] {
    const numeric = version.replace(/^v/i, '').match(/\d+(?:\.\d+){0,3}/)?.[0]
    if (!numeric) return [version.toLowerCase()]

    const parts = numeric.split('.')
    const candidates = [
      parts.slice(0, 3).join('.'),
      parts.slice(0, 2).join('.'),
      parts[0]
    ].filter(Boolean)

    return [...new Set(candidates.map(candidate => candidate.toLowerCase()))]
  }

  private toStatus(product: EOLProduct, release: EOLRelease): EOLStatus {
    const eolDate = release.eolFrom || null
    const status = this.determineStatus(release)
    const days = this.calculateEOLDays(eolDate)
    return {
      status,
      productName: product.name,
      productLabel: product.label || product.name,
      matchedCycle: release.name,
      eolDate,
      supportEndDate: release.eoasFrom || null,
      daysUntilEOL: days.daysUntilEOL,
      daysSinceEOL: days.daysSinceEOL,
      lts: release.isLts ?? null,
      latestVersion: release.latest?.name || null,
      latestReleaseDate: release.latest?.date || null,
      source: {
        name: 'endoflife.date',
        url: product.links?.html || `https://endoflife.date/${product.name}`
      }
    }
  }

  private determineStatus(release: EOLRelease): EOLStatusValue {
    if (release.isEol || this.isPast(release.eolFrom)) return 'unsupported'
    if (this.isApproaching(release.eolFrom)) return 'approaching_eol'
    return 'active'
  }

  private isPast(date?: string | null): boolean {
    if (!date) return false
    return Date.parse(date) <= Date.now()
  }

  private isApproaching(date?: string | null): boolean {
    if (!date) return false
    const time = Date.parse(date)
    if (Number.isNaN(time)) return false
    const days = (time - Date.now()) / (24 * 60 * 60 * 1000)
    return days >= 0 && days <= this.getApproachingDays()
  }

  getApproachingDays(): number {
    try {
      const configured = Number(useRuntimeConfig().eolApproachingDays)
      if (Number.isFinite(configured) && configured > 0) return configured
    } catch {
      // Unit tests instantiate the service outside Nuxt runtime context.
    }

    const envValue = Number(process.env.EOL_APPROACHING_DAYS)
    return Number.isFinite(envValue) && envValue > 0 ? envValue : DEFAULT_APPROACHING_EOL_DAYS
  }

  private calculateEOLDays(date?: string | null): Pick<EOLStatus, 'daysUntilEOL' | 'daysSinceEOL'> {
    if (!date) {
      return { daysUntilEOL: null, daysSinceEOL: null }
    }

    const time = Date.parse(`${date}T00:00:00Z`)
    if (Number.isNaN(time)) {
      return { daysUntilEOL: null, daysSinceEOL: null }
    }

    const diffDays = Math.ceil((time - Date.now()) / (24 * 60 * 60 * 1000))
    return diffDays >= 0
      ? { daysUntilEOL: diffDays, daysSinceEOL: null }
      : { daysUntilEOL: null, daysSinceEOL: Math.abs(diffDays) }
  }

  private unknown(reason: EOLStatus['reason'], productName: string | null, product: EOLProduct | null): EOLStatus {
    return {
      status: 'unknown',
      productName,
      productLabel: product?.label || product?.name || productName,
      matchedCycle: null,
      eolDate: null,
      supportEndDate: null,
      daysUntilEOL: null,
      daysSinceEOL: null,
      lts: null,
      latestVersion: null,
      latestReleaseDate: null,
      source: {
        name: 'endoflife.date',
        url: product?.links?.html || (productName ? `https://endoflife.date/${productName}` : null)
      },
      reason
    }
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return await response.json() as T
}
