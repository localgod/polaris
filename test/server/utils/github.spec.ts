import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchManifestFiles, listGitHubOwnerRepositories, listOrgRepositories, parseGitHubOwner } from '../../../server/utils/github'

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

  describe('fetchManifestFiles()', () => {
    it('treats a 409 tree response as no manifests', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Git Repository is empty.' }), {
          status: 409,
          statusText: 'Conflict'
        }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await fetchManifestFiles('VisualPHPUnit', 'visualphpunit.github.io', 'master')

      expect(result).toEqual([])
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/repos/VisualPHPUnit/visualphpunit.github.io/git/trees/master?recursive=1'),
        expect.any(Object)
      )
    })
  })
})
