/**
 * Normalize repository URL to prevent duplicates
 * 
 * @param url - Repository URL to normalize
 * @returns Normalized URL
 */
export function normalizeRepoUrl(url: string): string {
  if (!url) return url

  // Remove trailing slashes
  url = url.replace(/\/+$/, '')
  
  // Remove .git suffix
  url = url.replace(/\.git$/, '')
  
  // Convert SSH to HTTPS for GitHub
  url = url.replace(/^git@github\.com:/, 'https://github.com/')
  
  // Convert SSH to HTTPS for GitLab
  url = url.replace(/^git@gitlab\.com:/, 'https://gitlab.com/')
  
  // Convert SSH to HTTPS for Bitbucket
  url = url.replace(/^git@bitbucket\.org:/, 'https://bitbucket.org/')
  
  // Lowercase for consistency
  return url.toLowerCase()
}

/**
 * Detect SCM type from repository URL
 * 
 * @param url - Repository URL
 * @returns Detected SCM type or 'git' as default
 */
export function detectScmType(url: string): string {
  if (!url) return 'git'
  
  const lowerUrl = url.toLowerCase()
  
  if (lowerUrl.includes('github.com') || 
      lowerUrl.includes('gitlab.com') || 
      lowerUrl.includes('bitbucket.org')) {
    return 'git'
  }
  
  if (lowerUrl.includes('svn.') || lowerUrl.includes('/svn/')) {
    return 'svn'
  }
  
  if (lowerUrl.includes('hg.') || lowerUrl.includes('/hg/')) {
    return 'mercurial'
  }
  
  // Default to git
  return 'git'
}

/**
 * Extract repository name from URL
 * 
 * @param url - Repository URL
 * @returns Extracted repository name
 */
export function extractRepoName(url: string): string {
  if (!url) return ''
  
  // Remove .git suffix first
  url = url.replace(/\.git$/, '')
  
  // Extract last part of path
  const match = url.match(/\/([^/]+?)$/)
  if (match) {
    return match[1]
  }
  
  return ''
}

/**
 * Determine if repository is likely public based on URL
 * 
 * @param url - Repository URL
 * @returns True if likely public
 */
export function isLikelyPublic(url: string): boolean {
  if (!url) return false
  
  const lowerUrl = url.toLowerCase()
  
  // GitHub/GitLab public repos
  if ((lowerUrl.includes('github.com') || lowerUrl.includes('gitlab.com')) &&
      !lowerUrl.includes('/private/')) {
    return true
  }
  
  // Bitbucket public repos
  if (lowerUrl.includes('bitbucket.org')) {
    return true
  }
  
  return false
}
