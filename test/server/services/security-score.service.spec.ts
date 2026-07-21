import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SecurityScoreService } from '../../../server/services/security-score.service'

function createStorage() {
  const cache = new Map<string, unknown>()
  return {
    getItem: vi.fn(async (key: string) => cache.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      cache.set(key, value)
    })
  }
}

const scorecardResponse = {
  date: '2026-05-30',
  score: 8.4,
  checks: [
    { name: 'Code-Review', score: 9, reason: 'Found pull request reviews.' },
    { name: 'Dependency-Update-Tool', score: 10, reason: 'Detected dependency update tool.' },
    { name: 'Vulnerabilities', score: 7, reason: 'No known vulnerabilities detected.' },
    { name: 'Maintained', score: 8, reason: 'Repository has recent commits.' },
    { name: 'Binary-Artifacts', score: 4, reason: 'Binary artifacts detected.' }
  ]
}

function notFound() {
  return Object.assign(new Error('not found'), { statusCode: 404 })
}

describe('[pin] SecurityScoreService', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-02T00:00:00Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses supported GitHub repository URLs', () => {
    const service = new SecurityScoreService()

    expect(service.parseGitHubRepository('https://github.com/nuxt/nuxt')).toEqual({ owner: 'nuxt', name: 'nuxt' })
    expect(service.parseGitHubRepository('https://github.com/nuxt/nuxt.git')).toEqual({ owner: 'nuxt', name: 'nuxt' })
    expect(service.parseGitHubRepository('https://github.com/nuxt/nuxt/tree/main')).toEqual({ owner: 'nuxt', name: 'nuxt' })
    expect(service.parseGitHubRepository('git+https://github.com/nuxt/nuxt.git')).toEqual({ owner: 'nuxt', name: 'nuxt' })
    expect(service.parseGitHubRepository('git://github.com/nuxt/nuxt.git')).toEqual({ owner: 'nuxt', name: 'nuxt' })
    expect(service.parseGitHubRepository('ssh://git@github.com/nuxt/nuxt.git')).toEqual({ owner: 'nuxt', name: 'nuxt' })
    expect(service.parseGitHubRepository('git@github.com:nuxt/nuxt.git')).toEqual({ owner: 'nuxt', name: 'nuxt' })
  })

  it('ignores unsupported repository URLs', () => {
    const service = new SecurityScoreService()

    expect(service.parseGitHubRepository('https://gitlab.com/nuxt/nuxt')).toBeNull()
    expect(service.parseGitHubRepository('https://github.com/nuxt')).toBeNull()
    expect(service.parseGitHubRepository('not-a-url')).toBeNull()
  })

  it('prefers VCS external references over homepage when resolving a repository', () => {
    const service = new SecurityScoreService()

    expect(service.resolveRepository({
      homepage: 'https://github.com/other/project',
      externalReferences: [
        { type: 'documentation', url: 'https://github.com/docs/project' },
        { type: 'vcs', url: 'https://github.com/nuxt/nuxt.git' }
      ]
    })).toEqual({ owner: 'nuxt', name: 'nuxt' })
  })

  it('fetches scorecard data and maps a stable Polaris response', async () => {
    const storage = createStorage()
    const fetcher = vi.fn(async () => scorecardResponse)
    const service = new SecurityScoreService(fetcher as never, () => storage)

    const scorecard = await service.getScore({
      homepage: null,
      externalReferences: [{ type: 'vcs', url: 'https://github.com/nuxt/nuxt' }]
    })

    expect(fetcher).toHaveBeenCalledWith('https://api.scorecard.dev/projects/github.com/nuxt/nuxt')
    expect(scorecard).toMatchObject({
      status: 'available',
      repository: {
        host: 'github.com',
        owner: 'nuxt',
        name: 'nuxt',
        url: 'https://github.com/nuxt/nuxt'
      },
      score: 8.4,
      scannedAt: '2026-05-30',
      source: {
        name: 'OpenSSF Scorecard',
        url: 'https://scorecard.dev/viewer/?uri=github.com/nuxt/nuxt'
      }
    })
    expect(scorecard.checks).toEqual([
      { name: 'Code-Review', score: 9, reason: 'Found pull request reviews.' },
      { name: 'Dependency-Update-Tool', score: 10, reason: 'Detected dependency update tool.' },
      { name: 'Vulnerabilities', score: 7, reason: 'No known vulnerabilities detected.' },
      { name: 'Maintained', score: 8, reason: 'Repository has recent commits.' }
    ])
  })

  it('caches scorecard responses for repeated lookups', async () => {
    const storage = createStorage()
    const fetcher = vi.fn(async () => scorecardResponse)
    const service = new SecurityScoreService(fetcher as never, () => storage)

    await service.getScore({ homepage: 'https://github.com/nuxt/nuxt', externalReferences: [] })
    await service.getScore({ homepage: 'https://github.com/nuxt/nuxt', externalReferences: [] })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(storage.setItem).toHaveBeenCalledWith('scorecard:v1:github:nuxt/nuxt', expect.any(Object))
  })

  it('returns unavailable for missing, unsupported, not found, and failed lookups', async () => {
    const storage = createStorage()
    const service = new SecurityScoreService(vi.fn(async () => {
      throw new Error('network unavailable')
    }) as never, () => storage)

    await expect(service.getScore({ homepage: null, externalReferences: [] })).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'missing_repository'
    })
    await expect(service.getScore({ homepage: 'https://gitlab.com/nuxt/nuxt', externalReferences: [] })).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'unsupported_repository'
    })
    await expect(service.getScore({ homepage: 'https://github.com/nuxt/nuxt', externalReferences: [] })).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'fetch_failed'
    })

    const notFoundService = new SecurityScoreService(vi.fn(async () => {
      throw notFound()
    }) as never, () => createStorage())
    await expect(notFoundService.getScore({ homepage: 'https://github.com/missing/project', externalReferences: [] })).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'repository_not_found',
      repository: {
        owner: 'missing',
        name: 'project'
      }
    })
  })
})
