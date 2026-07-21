import { describe, it, expect } from 'vitest'
import { normalizeRepoUrl, detectScmType, extractRepoName, isLikelyPublic } from '../../../server/utils/repository'

describe('[pin] normalizeRepoUrl', () => {
  it('returns the value unchanged for an empty string', () => {
    expect(normalizeRepoUrl('')).toBe('')
  })

  it('removes a trailing slash', () => {
    expect(normalizeRepoUrl('https://github.com/org/repo/')).toBe('https://github.com/org/repo')
  })

  it('removes multiple trailing slashes', () => {
    expect(normalizeRepoUrl('https://github.com/org/repo///')).toBe('https://github.com/org/repo')
  })

  it('removes a .git suffix', () => {
    expect(normalizeRepoUrl('https://github.com/org/repo.git')).toBe('https://github.com/org/repo')
  })

  it('converts GitHub SSH to HTTPS', () => {
    expect(normalizeRepoUrl('git@github.com:org/repo.git')).toBe('https://github.com/org/repo')
  })

  it('converts GitLab SSH to HTTPS', () => {
    expect(normalizeRepoUrl('git@gitlab.com:org/repo.git')).toBe('https://gitlab.com/org/repo')
  })

  it('converts Bitbucket SSH to HTTPS', () => {
    expect(normalizeRepoUrl('git@bitbucket.org:org/repo.git')).toBe('https://bitbucket.org/org/repo')
  })

  it('lowercases the result', () => {
    expect(normalizeRepoUrl('https://GitHub.com/Org/Repo')).toBe('https://github.com/org/repo')
  })
})

describe('[pin] detectScmType', () => {
  it('returns git for an empty string', () => {
    expect(detectScmType('')).toBe('git')
  })

  it('returns git for a GitHub URL', () => {
    expect(detectScmType('https://github.com/org/repo')).toBe('git')
  })

  it('returns git for a GitLab URL', () => {
    expect(detectScmType('https://gitlab.com/org/repo')).toBe('git')
  })

  it('returns git for a Bitbucket URL', () => {
    expect(detectScmType('https://bitbucket.org/org/repo')).toBe('git')
  })

  it('returns svn for a URL containing svn.', () => {
    expect(detectScmType('https://svn.example.com/repo')).toBe('svn')
  })

  it('returns svn for a URL containing /svn/', () => {
    expect(detectScmType('https://example.com/svn/repo')).toBe('svn')
  })

  it('returns mercurial for a URL containing hg.', () => {
    expect(detectScmType('https://hg.example.com/repo')).toBe('mercurial')
  })

  it('returns mercurial for a URL containing /hg/', () => {
    expect(detectScmType('https://example.com/hg/repo')).toBe('mercurial')
  })

  it('defaults to git for an unrecognised URL', () => {
    expect(detectScmType('https://example.com/repo')).toBe('git')
  })
})

describe('[pin] extractRepoName', () => {
  it('returns empty string for an empty URL', () => {
    expect(extractRepoName('')).toBe('')
  })

  it('extracts the last path segment', () => {
    expect(extractRepoName('https://github.com/org/my-repo')).toBe('my-repo')
  })

  it('strips a .git suffix before extracting', () => {
    expect(extractRepoName('https://github.com/org/my-repo.git')).toBe('my-repo')
  })
})

describe('[pin] isLikelyPublic', () => {
  it('returns false for an empty URL', () => {
    expect(isLikelyPublic('')).toBe(false)
  })

  it('returns true for a GitHub URL', () => {
    expect(isLikelyPublic('https://github.com/org/repo')).toBe(true)
  })

  it('returns true for a GitLab URL', () => {
    expect(isLikelyPublic('https://gitlab.com/org/repo')).toBe(true)
  })

  it('returns true for a Bitbucket URL', () => {
    expect(isLikelyPublic('https://bitbucket.org/org/repo')).toBe(true)
  })

  it('returns false for an internal/unknown host', () => {
    expect(isLikelyPublic('https://git.internal.example.com/org/repo')).toBe(false)
  })
})
