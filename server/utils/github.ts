/**
 * GitHub API utilities for fetching repository metadata and cloning repositories.
 *
 * Used by the GitHub import feature to create systems from GitHub repos.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger'

const execFileAsync = promisify(execFile)

export interface GitHubRepoMetadata {
  name: string
  full_name: string
  description: string | null
  default_branch: string
  language: string | null
  private: boolean
  html_url: string
  topics: string[]
  license: { spdx_id: string; name: string } | null
}


export interface GitHubOrgRepository {
  name: string
  full_name: string
  html_url: string
  description: string | null
  default_branch: string
  language: string | null
  private: boolean
  fork: boolean
  archived: boolean
  topics: string[]
}

export interface GitHubOrgRepositoryFilters {
  language?: string
  topic?: string
  namePattern?: string
}

type GitHubRepositoryOwnerType = 'organization' | 'user'

class GitHubApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message)
    this.name = 'GitHubApiError'
  }
}


/**
 * Parse a GitHub URL or owner/repo shorthand into owner and repo.
 */
export function parseGitHubRepo(input: string): { owner: string; repo: string } {
  // Handle owner/repo shorthand
  const shorthand = input.match(/^([^/]+)\/([^/]+)$/)
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2] }
  }

  // Handle full URL
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/)
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] }
  }

  throw new Error(`Cannot parse GitHub repository from: ${input}`)
}

/**
 * Parse a GitHub organization/user name or profile URL into an owner login.
 */
export function parseGitHubOwner(input: string): string {
  const value = input.trim()
  if (/^[A-Za-z0-9_.-]+$/.test(value)) {
    return value
  }

  try {
    const url = new URL(value)
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
      throw new Error('not github')
    }

    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length === 1 && /^[A-Za-z0-9_.-]+$/.test(segments[0])) {
      return segments[0]
    }
  } catch {
    // Fall through to the common error below.
  }

  throw new Error(`Cannot parse GitHub owner from: ${input}`)
}

/**
 * Build GitHub API request headers.
 * Prefers the explicitly supplied token; falls back to GITHUB_TOKEN env var.
 */
function githubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Polaris'
  }
  const resolved = token || process.env.GITHUB_TOKEN
  if (resolved) {
    headers['Authorization'] = `Bearer ${resolved}`
  }
  return headers
}

/**
 * Throw a structured error for non-OK GitHub API responses.
 * Maps 401/403 (auth/rate-limit) and 404 to specific messages so callers
 * can surface them as 422 rather than 500.
 */
function throwGitHubError(status: number, statusText: string, context: string): never {
  if (status === 404) {
    throw new GitHubApiError(status, statusText, `${context} not found`)
  }
  if (status === 401) {
    throw new GitHubApiError(status, statusText, `GitHub API authentication failed for ${context} — check GITHUB_TOKEN`)
  }
  if (status === 403) {
    throw new GitHubApiError(status, statusText, `GitHub API rate limit exceeded or access denied for ${context}`)
  }
  if (status === 429) {
    throw new GitHubApiError(status, statusText, `GitHub API rate limit exceeded for ${context}`)
  }
  throw new GitHubApiError(status, statusText, `GitHub API error ${status} ${statusText} for ${context}`)
}

function parseRateLimitReset(response: Response): number | null {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10)
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  }

  const remaining = response.headers.get('x-ratelimit-remaining')
  const reset = response.headers.get('x-ratelimit-reset')
  if (remaining === '0' && reset) {
    const resetAt = Number.parseInt(reset, 10) * 1000
    const delay = resetAt - Date.now()
    if (Number.isFinite(delay) && delay > 0) return delay
  }

  return null
}

async function fetchGitHub(url: string, context: string, token?: string): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, { headers: githubHeaders(token) })
    if (response.ok) return response

    const delay = parseRateLimitReset(response)
    if ((response.status === 403 || response.status === 429) && delay && delay <= 60_000 && attempt === 0) {
      logger.warn({ context, delay }, 'GitHub API rate limited, backing off before retry')
      await new Promise(resolve => setTimeout(resolve, delay))
      continue
    }

    throwGitHubError(response.status, response.statusText, context)
  }

  throw new Error(`GitHub API request failed for ${context}`)
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof GitHubApiError && error.status === 404
}

/**
 * Fetch repository metadata from the GitHub API.
 */
export async function fetchRepoMetadata(owner: string, repo: string, token?: string): Promise<GitHubRepoMetadata> {
  const url = `https://api.github.com/repos/${owner}/${repo}`
  const response = await fetchGitHub(url, `repository ${owner}/${repo}`, token)

  return await response.json() as GitHubRepoMetadata
}


function compileNamePattern(pattern?: string): RegExp | null {
  if (!pattern) return null
  try {
    return new RegExp(pattern, 'i')
  } catch {
    throw new Error('namePattern must be a valid regular expression')
  }
}

function matchesOrgRepositoryFilters(
  repo: GitHubOrgRepository,
  filters: GitHubOrgRepositoryFilters = {},
  nameRegex = compileNamePattern(filters.namePattern)
): boolean {
  if (filters.language && repo.language?.toLowerCase() !== filters.language.toLowerCase()) {
    return false
  }

  if (filters.topic && !(repo.topics || []).some(topic => topic.toLowerCase() === filters.topic!.toLowerCase())) {
    return false
  }

  if (nameRegex && !nameRegex.test(repo.name) && !nameRegex.test(repo.full_name)) {
    return false
  }

  return true
}

async function listRepositoriesForOwner(
  owner: string,
  ownerType: GitHubRepositoryOwnerType,
  filters: GitHubOrgRepositoryFilters = {},
  token?: string
): Promise<GitHubOrgRepository[]> {
  const nameRegex = compileNamePattern(filters.namePattern)
  const repos: GitHubOrgRepository[] = []
  const perPage = 100
  const basePath = ownerType === 'organization'
    ? `orgs/${encodeURIComponent(owner)}/repos?type=all`
    : `users/${encodeURIComponent(owner)}/repos?type=owner`
  const context = ownerType === 'organization'
    ? `organization ${owner} repositories`
    : `user ${owner} repositories`

  for (let page = 1; ; page++) {
    const url = `https://api.github.com/${basePath}&sort=full_name&per_page=${perPage}&page=${page}`
    const response = await fetchGitHub(url, context, token)
    const data = await response.json() as GitHubOrgRepository[]

    repos.push(...data.filter(repo => matchesOrgRepositoryFilters(repo, filters, nameRegex)))

    if (data.length < perPage) break
  }

  return repos
}

/**
 * List the token's own repositories via GET /user/repos, which — unlike
 * GET /users/{username}/repos — is scoped to the authenticated account and
 * includes private repos. There is no owner path segment: GitHub infers the
 * account from the bearer token.
 */
async function listAuthenticatedUserRepositories(
  filters: GitHubOrgRepositoryFilters = {},
  token: string
): Promise<GitHubOrgRepository[]> {
  const nameRegex = compileNamePattern(filters.namePattern)
  const repos: GitHubOrgRepository[] = []
  const perPage = 100

  for (let page = 1; ; page++) {
    const url = `https://api.github.com/user/repos?affiliation=owner&visibility=all&sort=full_name&per_page=${perPage}&page=${page}`
    const response = await fetchGitHub(url, 'authenticated user repositories', token)
    const data = await response.json() as GitHubOrgRepository[]

    repos.push(...data.filter(repo => matchesOrgRepositoryFilters(repo, filters, nameRegex)))

    if (data.length < perPage) break
  }

  return repos
}

/** Fetch the login of the account a token belongs to, or null if it can't be resolved. */
async function getAuthenticatedLogin(token: string): Promise<string | null> {
  try {
    const response = await fetchGitHub('https://api.github.com/user', 'authenticated user', token)
    const data = await response.json() as { login?: string }
    return data.login || null
  } catch (error: unknown) {
    logger.warn({ err: error }, 'Failed to resolve authenticated GitHub login')
    return null
  }
}

/**
 * List repositories for a GitHub organization or user, following pagination.
 * Organization listing is attempted first so authenticated tokens can include
 * private organization repositories. If no organization exists and the owner
 * is the token's own account, the authenticated /user/repos endpoint is used
 * so private repos are included; otherwise falls back to the public user
 * repositories endpoint (GET /users/{username}/repos only ever returns public
 * repos, regardless of the caller's token or scopes).
 */
export async function listGitHubOwnerRepositories(
  ownerInput: string,
  filters: GitHubOrgRepositoryFilters = {},
  token?: string
): Promise<GitHubOrgRepository[]> {
  const owner = parseGitHubOwner(ownerInput)

  try {
    return await listRepositoriesForOwner(owner, 'organization', filters, token)
  } catch (error: unknown) {
    if (!isNotFoundError(error)) throw error
  }

  if (token) {
    const login = await getAuthenticatedLogin(token)
    if (login && login.toLowerCase() === owner.toLowerCase()) {
      return await listAuthenticatedUserRepositories(filters, token)
    }
  }

  return await listRepositoriesForOwner(owner, 'user', filters, token)
}

/**
 * List repositories for a GitHub organisation, following REST API pagination.
 */
export async function listOrgRepositories(
  organization: string,
  filters: GitHubOrgRepositoryFilters = {},
  token?: string
): Promise<GitHubOrgRepository[]> {
  const org = parseGitHubOwner(organization)
  return await listRepositoriesForOwner(org, 'organization', filters, token)
}

/**
 * Run an array of async tasks with a bounded concurrency limit.
 * Returns settled results in the same order as the input tasks.
 */
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let next = 0

  async function worker() {
    while (next < tasks.length) {
      const index = next++
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]() }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

/**
 * Shallow-clone a GitHub repository to a local directory using git.
 *
 * Uses --depth=1 to fetch only the latest commit, keeping disk and network usage minimal.
 * The token is injected into the HTTPS URL so no separate credential setup is needed.
 * Requires git to be available on PATH.
 */
export async function cloneRepository(repoUrl: string, targetDir: string, token: string): Promise<void> {
  const { owner, repo } = parseGitHubRepo(repoUrl)
  const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`

  try {
    await execFileAsync('git', ['clone', '--depth=1', '--quiet', cloneUrl, targetDir])
  } catch (error: unknown) {
    const stderr = (error as { stderr?: string }).stderr || ''
    if (stderr.includes('Repository not found') || stderr.includes('not found')) {
      throw new GitHubApiError(404, 'Not Found', `repository ${owner}/${repo} not found`)
    }
    if (stderr.includes('Authentication failed') || stderr.includes('could not read Username')) {
      throw new GitHubApiError(401, 'Unauthorized', `GitHub authentication failed for ${owner}/${repo} — check your GitHub token scope`)
    }
    throw new Error(`git clone failed for ${owner}/${repo}: ${stderr || String(error)}`, { cause: error })
  }
}
