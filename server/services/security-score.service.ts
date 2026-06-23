import type { Component, ExternalReference, SecurityScorecard, SecurityScorecardCheck, SecurityScorecardUnavailableReason } from '~~/types/api'
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

interface ScorecardResponse {
  date?: string
  score?: number
  checks?: ScorecardCheckResponse[]
}

interface ScorecardCheckResponse {
  name?: string
  score?: number
  reason?: string
}

export interface GitHubRepository {
  owner: string
  name: string
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const SCORECARD_API_BASE = 'https://api.scorecard.dev/projects/github.com'
const SCORECARD_WEB_BASE = 'https://scorecard.dev/viewer/?uri=github.com'

const SELECTED_CHECKS = [
  'Code-Review',
  'Dependency-Update-Tool',
  'Vulnerabilities',
  'Security-Policy',
  'Maintained',
  'SAST',
  'Signed-Releases'
]

const REPOSITORY_REFERENCE_TYPES = new Set([
  'vcs',
  'source',
  'source-distribution',
  'distribution',
  'website'
])

export class SecurityScoreService {
  constructor(
    private readonly fetcher: JsonFetcher = fetchJson,
    private readonly storageFactory: () => CacheStorage = () => useStorage('cache:api') as CacheStorage
  ) {}

  async getScore(component: Pick<Component, 'homepage' | 'externalReferences'>): Promise<SecurityScorecard> {
    const repository = this.resolveRepository(component)
    if (!repository) {
      return this.unavailable(this.hasRepositoryCandidate(component) ? 'unsupported_repository' : 'missing_repository', null)
    }

    try {
      const scorecard = await this.getScorecard(repository)
      return this.available(repository, scorecard)
    } catch (error) {
      if (!this.isNotFound(error)) {
        logger.warn({ err: error, repository }, 'Security scorecard fetch failed')
      }
      return this.unavailable(this.isNotFound(error) ? 'repository_not_found' : 'fetch_failed', repository)
    }
  }

  resolveRepository(component: Pick<Component, 'homepage' | 'externalReferences'>): GitHubRepository | null {
    const candidates = [
      ...this.referenceCandidates(component.externalReferences),
      component.homepage
    ]

    for (const candidate of candidates) {
      const repository = this.parseGitHubRepository(candidate)
      if (repository) return repository
    }

    return null
  }

  parseGitHubRepository(value?: string | null): GitHubRepository | null {
    if (!value) return null

    const normalized = value.trim()
      .replace(/^git\+/, '')
      .replace(/^ssh:\/\/git@github\.com\//i, 'https://github.com/')
      .replace(/^git:\/\/github\.com\//i, 'https://github.com/')
      .replace(/^git@github\.com:/i, 'https://github.com/')
      .replace(/^git@github\.com\//i, 'https://github.com/')

    let path: string
    try {
      const url = new URL(normalized)
      if (url.hostname.toLowerCase() !== 'github.com') return null
      path = url.pathname
    } catch {
      return null
    }

    const [owner, repo] = path
      .replace(/^\/+/, '')
      .split(/[?#]/, 1)[0]!
      .split('/')

    if (!owner || !repo) return null

    const name = repo.replace(/\.git$/i, '')
    if (!this.validGitHubPathSegment(owner) || !this.validGitHubPathSegment(name)) {
      return null
    }

    return {
      owner: owner.toLowerCase(),
      name: name.toLowerCase()
    }
  }

  private referenceCandidates(references: ExternalReference[] = []): Array<string | null> {
    const prioritized = references.filter(reference => REPOSITORY_REFERENCE_TYPES.has(reference.type?.toLowerCase()))
    const remaining = references.filter(reference => !REPOSITORY_REFERENCE_TYPES.has(reference.type?.toLowerCase()))
    return [...prioritized, ...remaining].map(reference => reference.url)
  }

  private hasRepositoryCandidate(component: Pick<Component, 'homepage' | 'externalReferences'>): boolean {
    return Boolean(component.homepage || component.externalReferences.some(reference => reference.url))
  }

  private async getScorecard(repository: GitHubRepository): Promise<ScorecardResponse> {
    const key = `scorecard:v1:github:${repository.owner}/${repository.name}`
    return await this.cached(key, () => this.fetcher<ScorecardResponse>(this.apiUrl(repository)))
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

  private available(repository: GitHubRepository, response: ScorecardResponse): SecurityScorecard {
    return {
      status: 'available',
      repository: this.repositoryPayload(repository),
      score: typeof response.score === 'number' ? response.score : null,
      checks: this.selectedChecks(response.checks || []),
      scannedAt: response.date || null,
      source: {
        name: 'OpenSSF Scorecard',
        url: this.webUrl(repository)
      }
    }
  }

  private unavailable(reason: SecurityScorecardUnavailableReason, repository: GitHubRepository | null): SecurityScorecard {
    return {
      status: 'unavailable',
      reason,
      repository: repository ? this.repositoryPayload(repository) : null,
      score: null,
      checks: [],
      scannedAt: null,
      source: {
        name: 'OpenSSF Scorecard',
        url: repository ? this.webUrl(repository) : null
      }
    }
  }

  private selectedChecks(checks: ScorecardCheckResponse[]): SecurityScorecardCheck[] {
    const byName = new Map(checks.map(check => [check.name, check]))

    return SELECTED_CHECKS
      .map(name => byName.get(name))
      .filter((check): check is ScorecardCheckResponse => Boolean(check?.name))
      .map(check => ({
        name: check.name!,
        score: typeof check.score === 'number' ? check.score : null,
        reason: check.reason || null
      }))
  }

  private repositoryPayload(repository: GitHubRepository): NonNullable<SecurityScorecard['repository']> {
    return {
      host: 'github.com',
      owner: repository.owner,
      name: repository.name,
      url: `https://github.com/${repository.owner}/${repository.name}`
    }
  }

  private apiUrl(repository: GitHubRepository): string {
    return `${SCORECARD_API_BASE}/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`
  }

  private webUrl(repository: GitHubRepository): string {
    return `${SCORECARD_WEB_BASE}/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`
  }

  private validGitHubPathSegment(value: string): boolean {
    return /^[a-z0-9_.-]+$/i.test(value)
  }

  private isNotFound(error: unknown): boolean {
    const statusCode = typeof error === 'object' && error && 'statusCode' in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : null

    return statusCode === 404
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
