import { fetchRegistryDescription } from '../../utils/registry-fetcher'

interface CacheEntry {
  description: string | null
  expiresAt: number
}

// Module-level in-memory cache. Shared across all requests within a server
// process lifetime. Keys are `packageManager:group/name` or `packageManager:name`.
const cache = new Map<string, CacheEntry>()

const TTL_MS = 60 * 60 * 1000 // 1 hour

function normalizeCacheKeyPart(value: string): string {
  return value.trim().toLowerCase()
}

function cacheKey(packageManager: string, name: string, group?: string): string {
  const normalizedPackageManager = normalizeCacheKeyPart(packageManager)
  const normalizedName = normalizeCacheKeyPart(name)
  const normalizedGroup = group ? normalizeCacheKeyPart(group) : undefined

  return normalizedGroup
    ? `${normalizedPackageManager}:${normalizedGroup}/${normalizedName}`
    : `${normalizedPackageManager}:${normalizedName}`
}

/**
 * @openapi
 * /components/description:
 *   get:
 *     tags:
 *       - Components
 *     summary: Fetch package description from registry
 *     description: |
 *       Returns the description for a package from its public registry (npm, PyPI,
 *       NuGet, Cargo, etc.). Results are cached server-side for 1 hour. Returns null
 *       when the registry is unsupported or the package has no description.
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Package name
 *       - in: query
 *         name: packageManager
 *         required: true
 *         schema:
 *           type: string
 *         description: Package manager (npm, pypi, maven, nuget, cargo, golang)
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *         description: Package group or scope (e.g. npm scope without @, Maven groupId)
 *     responses:
 *       200:
 *         description: Description retrieved (may be null)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 description:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Missing required parameters
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const name = query.name as string | undefined
  const packageManager = query.packageManager as string | undefined
  const group = query.group as string | undefined

  if (!name || !packageManager) {
    setResponseStatus(event, 400)
    return { error: 'name and packageManager are required' }
  }

  const key = cacheKey(packageManager, name, group)
  const cached = cache.get(key)

  if (cached && cached.expiresAt > Date.now()) {
    return { description: cached.description }
  }

  if (cached) {
    cache.delete(key)
  }
  const description = await fetchRegistryDescription(name, packageManager, group)

  cache.set(key, { description, expiresAt: Date.now() + TTL_MS })

  return { description }
})
