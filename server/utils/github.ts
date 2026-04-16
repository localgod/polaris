/**
 * GitHub API utilities for fetching repository metadata and dependency manifests.
 *
 * Used by the GitHub import feature to create systems without cloning repos.
 */

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
    throw new Error(`${context} not found`)
  }
  if (status === 401) {
    throw new Error(`GitHub API authentication failed for ${context} — check GITHUB_TOKEN`)
  }
  if (status === 403) {
    throw new Error(`GitHub API rate limit exceeded or access denied for ${context}`)
  }
  if (status === 429) {
    throw new Error(`GitHub API rate limit exceeded for ${context}`)
  }
  throw new Error(`GitHub API error ${status} ${statusText} for ${context}`)
}

/**
 * Fetch repository metadata from the GitHub API.
 */
export async function fetchRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
  const url = `https://api.github.com/repos/${owner}/${repo}`
  const response = await fetch(url, { headers: githubHeaders() })

  if (!response.ok) {
    throwGitHubError(response.status, response.statusText, `repository ${owner}/${repo}`)
  }

  return await response.json() as GitHubRepoMetadata
}

/**
 * Fetch the full file tree for a branch using the Git Trees API.
 */
export async function fetchFileTree(owner: string, repo: string, branch: string): Promise<GitHubTreeEntry[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  const response = await fetch(url, { headers: githubHeaders() })

  if (!response.ok) {
    throwGitHubError(response.status, response.statusText, `file tree for ${owner}/${repo}@${branch}`)
  }

  const data = await response.json() as { tree: GitHubTreeEntry[]; truncated: boolean }

  if (data.truncated) {
    // Repository has more than 100,000 tree entries; the tree is partial.
    // Log a warning but continue — manifests near the root will still be found.
    console.warn(`[github] Tree response truncated for ${owner}/${repo}@${branch} — large repo, some manifests may be missed`)
  }

  return data.tree
}

/**
 * Fetch a single file's content from the GitHub Contents API.
 * Returns decoded UTF-8 content.
 */
export async function fetchFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  const response = await fetch(url, { headers: githubHeaders() })

  if (!response.ok) {
    throwGitHubError(response.status, response.statusText, path)
  }

  const data = await response.json() as { content: string; encoding: string }

  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }

  return data.content
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
    .filter(entry => entry.type === 'blob' && isManifestFile(entry.path))
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
