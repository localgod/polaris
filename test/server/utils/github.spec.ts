import { afterEach, describe, expect, it, vi } from 'vitest'
import { listGitHubOwnerRepositories, listOrgRepositories, parseGitHubOwner, cloneRepository, runWithConcurrency } from '../../../server/utils/github'

vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

const repo = (name: string, overrides: Record<string, unknown> = {}) => ({
  name,
  full_name: `acme/${name}`,
  html_url: `https://github.com/acme/${name}`,
  description: null,
  default_branch: 'main',
  language: 'TypeScript',
  private: false,
  fork: false,
  archived: false,
  topics: ['platform'],
  ...overrides
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('GitHub utilities', () => {
  describe('parseGitHubOwner()', () => {
    it('accepts owner names and profile URLs', () => {
      expect(parseGitHubOwner('localgod')).toBe('localgod')
      expect(parseGitHubOwner('https://github.com/localgod')).toBe('localgod')
      expect(parseGitHubOwner('https://www.github.com/localgod/')).toBe('localgod')
    })

    it('rejects repository URLs for owner imports', () => {
      expect(() => parseGitHubOwner('https://github.com/localgod/polaris')).toThrow('Cannot parse')
    })
  })

  describe('listOrgRepositories()', () => {
    it('follows pagination and applies filters', async () => {
      const firstPage = [
        ...Array.from({ length: 99 }, (_, index) => repo(`service-${index}`)),
        repo('python-service', { language: 'Python' })
      ]
      const secondPage = [repo('service-final', { topics: ['platform', 'catalog'] })]

      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(firstPage), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(secondPage), { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await listOrgRepositories('acme', {
        language: 'TypeScript',
        topic: 'platform',
        namePattern: '^service-'
      })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(100)
      expect(result.some(item => item.name === 'python-service')).toBe(false)
      expect(result.at(-1)?.full_name).toBe('acme/service-final')
    })

    it('uses the supplied token in the Authorization header', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify([repo('private-service')]), { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      await listOrgRepositories('acme', {}, 'user-token-abc')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer user-token-abc' }) })
      )
    })

    it('rejects invalid organization names', async () => {
      await expect(listOrgRepositories('bad/org')).rejects.toThrow('Cannot parse')
    })

    it('rejects invalid name regex filters', async () => {
      await expect(listOrgRepositories('acme', { namePattern: '[' })).rejects.toThrow('namePattern')
    })
  })

  describe('listGitHubOwnerRepositories()', () => {
    it('falls back to user repositories when the owner is not an organization', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, statusText: 'Not Found' }))
        .mockResolvedValueOnce(new Response(JSON.stringify([repo('polaris', { full_name: 'localgod/polaris', html_url: 'https://github.com/localgod/polaris' })]), { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await listGitHubOwnerRepositories('https://github.com/localgod')

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/orgs/localgod/repos?type=all'),
        expect.any(Object)
      )
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/users/localgod/repos?type=owner'),
        expect.any(Object)
      )
      expect(result).toHaveLength(1)
      expect(result[0].full_name).toBe('localgod/polaris')
    })
  })

  describe('cloneRepository()', () => {
    it('invokes git clone with depth=1 and injects the token into the URL', async () => {
      const { execFile } = await import('child_process')
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1] as (err: null, stdout: string, stderr: string) => void
        cb(null, '', '')
      })

      await cloneRepository('https://github.com/acme/repo-a', '/tmp/clone-dir', 'my-token')

      expect(execFile).toHaveBeenCalledWith(
        'git',
        ['clone', '--depth=1', '--quiet', 'https://x-access-token:my-token@github.com/acme/repo-a.git', '/tmp/clone-dir'],
        expect.any(Function)
      )
    })

    it('maps a "Repository not found" stderr to a 404 error', async () => {
      const { execFile } = await import('child_process')
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1] as (err: Error, stdout: string, stderr: string) => void
        const err = Object.assign(new Error('Command failed'), { stderr: 'ERROR: Repository not found.' })
        cb(err, '', 'ERROR: Repository not found.')
      })

      await expect(cloneRepository('https://github.com/acme/missing', '/tmp/dir', 'token'))
        .rejects.toThrow('not found')
    })

    it('maps an "Authentication failed" stderr to a 401 error', async () => {
      const { execFile } = await import('child_process')
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1] as (err: Error, stdout: string, stderr: string) => void
        const err = Object.assign(new Error('Command failed'), { stderr: 'fatal: Authentication failed' })
        cb(err, '', 'fatal: Authentication failed')
      })

      await expect(cloneRepository('https://github.com/acme/private', '/tmp/dir', 'bad-token'))
        .rejects.toThrow('authentication failed')
    })
  })

  describe('runWithConcurrency()', () => {
    it('runs all tasks and returns results in order', async () => {
      const tasks = [1, 2, 3].map(n => () => Promise.resolve(n * 10))
      const results = await runWithConcurrency(tasks, 2)

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ status: 'fulfilled', value: 10 })
      expect(results[1]).toEqual({ status: 'fulfilled', value: 20 })
      expect(results[2]).toEqual({ status: 'fulfilled', value: 30 })
    })

    it('captures rejections without stopping other tasks', async () => {
      const tasks = [
        () => Promise.resolve('ok'),
        () => Promise.reject(new Error('boom')),
        () => Promise.resolve('also ok')
      ]
      const results = await runWithConcurrency(tasks, 2)

      expect(results[0]).toEqual({ status: 'fulfilled', value: 'ok' })
      expect(results[1].status).toBe('rejected')
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'also ok' })
    })

    it('handles an empty task list', async () => {
      const results = await runWithConcurrency([], 5)
      expect(results).toHaveLength(0)
    })
  })
})
