/**
 * GitHub API utilities for fetching repository metadata and dependency manifests.
 *
 * Used by the GitHub import feature to create systems without cloning repos.
 */
import { logger } from './logger'

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

export interface GitHubTreeEntry {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

export interface GitHubFileContent {
  path: string
  content: string
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

/** Known dependency manifest and lockfile names */
const MANIFEST_FILENAMES = new Set([
  // Node.js
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  // PHP
  'composer.json',
  'composer.lock',
  // Python
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'Pipfile.lock',
  'poetry.lock',
  'setup.py',
  'setup.cfg',
  // Go
  'go.mod',
  'go.sum',
  // Java
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'gradle.lockfile',
  // Ruby
  'Gemfile',
  'Gemfile.lock',
  // Rust
  'Cargo.toml',
  'Cargo.lock',
  // .NET
  'packages.config',
  'packages.lock.json'
])

/** Also match *.csproj files */
function isManifestFile(path: string): boolean {
  const filename = path.split('/').pop() || ''
  if (MANIFEST_FILENAMES.has(filename)) return true
  if (filename.endsWith('.csproj')) return true
  return false
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
 * Includes a Bearer token when GITHUB_TOKEN is set in the environment,
 * raising the rate limit from 60 to 5,000 requests/hour.
 */
function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Polaris'
  }
  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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

async function fetchGitHub(url: string, context: string): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, { headers: githubHeaders() })
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

function isGitHubApiError(error: unknown, status: number): boolean {
  return error instanceof GitHubApiError && error.status === status
}

/**
 * Fetch repository metadata from the GitHub API.
 */
export async function fetchRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
  const url = `https://api.github.com/repos/${owner}/${repo}`
  const response = await fetchGitHub(url, `repository ${owner}/${repo}`)

  return await response.json() as GitHubRepoMetadata
}

/**
 * Fetch the full file tree for a branch using the Git Trees API.
 */
export async function fetchFileTree(owner: string, repo: string, branch: string): Promise<GitHubTreeEntry[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  let response: Response

  try {
    response = await fetchGitHub(url, `file tree for ${owner}/${repo}@${branch}`)
  } catch (error: unknown) {
    if (isGitHubApiError(error, 409)) {
      logger.warn({ owner, repo, branch }, 'GitHub tree unavailable for repository ref; continuing without manifests')
      return []
    }
    throw error
  }

  const data = await response.json() as { tree: GitHubTreeEntry[]; truncated: boolean }

  if (data.truncated) {
    // Repository has more than 100,000 tree entries; the tree is partial.
    // Log a warning but continue — manifests near the root will still be found.
    logger.warn({ owner, repo, branch }, 'GitHub tree response truncated — large repo, some manifests may be missed')
  }

  return data.tree
}

/**
 * Fetch a single file's content from the GitHub Contents API.
 * Returns decoded UTF-8 content.
 */
export async function fetchFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  const response = await fetchGitHub(url, path)

  const data = await response.json() as { content: string; encoding: string }

  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }

  return data.content
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
  filters: GitHubOrgRepositoryFilters = {}
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
    const response = await fetchGitHub(url, context)
    const data = await response.json() as GitHubOrgRepository[]

    repos.push(...data.filter(repo => matchesOrgRepositoryFilters(repo, filters, nameRegex)))

    if (data.length < perPage) break
  }

  return repos
}

/**
 * List repositories for a GitHub organization or user, following pagination.
 * Organization listing is attempted first so authenticated tokens can include
 * private organization repositories. If no organization exists, falls back to
 * the public user repositories endpoint.
 */
export async function listGitHubOwnerRepositories(
  ownerInput: string,
  filters: GitHubOrgRepositoryFilters = {}
): Promise<GitHubOrgRepository[]> {
  const owner = parseGitHubOwner(ownerInput)

  try {
    return await listRepositoriesForOwner(owner, 'organization', filters)
  } catch (error: unknown) {
    if (!isNotFoundError(error)) throw error
  }

  return await listRepositoriesForOwner(owner, 'user', filters)
}

/**
 * List repositories for a GitHub organisation, following REST API pagination.
 */
export async function listOrgRepositories(
  organization: string,
  filters: GitHubOrgRepositoryFilters = {}
): Promise<GitHubOrgRepository[]> {
  const org = parseGitHubOwner(organization)
  return await listRepositoriesForOwner(org, 'organization', filters)
}

/**
 * Identify and download dependency manifest files from a GitHub repository.
 *
 * 1. Fetches the file tree
 * 2. Filters for known manifest/lockfile names
 * 3. Downloads each matching file
 */
export async function fetchManifestFiles(
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubFileContent[]> {
  const tree = await fetchFileTree(owner, repo, branch)

  const manifestPaths = tree
    .filter(entry =>
      entry.type === 'blob' &&
      isManifestFile(entry.path) &&
      !entry.path.includes('node_modules/')
    )
    .map(entry => entry.path)

  if (manifestPaths.length === 0) {
    return []
  }

  const files: GitHubFileContent[] = []
  for (const path of manifestPaths) {
    try {
      const content = await fetchFileContent(owner, repo, path, branch)
      files.push({ path, content })
    } catch {
      // Skip files that fail to download (e.g., too large)
    }
  }

  return files
}
