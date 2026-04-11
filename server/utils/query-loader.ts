import { readFile } from 'fs/promises'
import { resolve } from 'path'

const queryCache = new Map<string, string>()

/**
 * Load a Cypher query from a .cypher file.
 *
 * In production (Nitro runtime) queries are read from the bundled server
 * assets configured in nuxt.config.ts (nitro.serverAssets). This avoids
 * relying on process.cwd() pointing to the source tree, which is not the
 * case inside the Docker runner image.
 *
 * In development and test environments the file is read directly from disk
 * via fs/promises, which keeps the test helper working without a Nitro context.
 *
 * @param path - Relative path from server/database/queries/ (e.g., 'technologies/find-all.cypher')
 * @returns The query string
 */
export async function loadQuery(path: string): Promise<string> {
  if (queryCache.has(path)) {
    return queryCache.get(path)!
  }

  let query: string

  // useStorage is only available inside the Nitro server runtime
  if (process.env.NODE_ENV === 'production' && typeof useStorage === 'function') {
    const storage = useStorage('assets:queries')
    // Nitro asset keys use colons as path separators and strip the extension
    const key = path.replace(/\//g, ':').replace(/\.cypher$/, '')
    query = await storage.getItem<string>(key) ?? ''
    if (!query) {
      throw new Error(`Query not found in server assets: ${path}`)
    }
  } else {
    const fullPath = resolve('./server/database/queries', path)
    query = await readFile(fullPath, 'utf-8')
  }

  // Cache in production for performance
  if (process.env.NODE_ENV === 'production') {
    queryCache.set(path, query)
  }

  return query
}

/**
 * Clear the query cache (useful for testing)
 */
export function clearQueryCache(): void {
  queryCache.clear()
}

/**
 * Inject WHERE conditions into a query template
 * Replaces {{WHERE_CONDITIONS}} placeholder with actual conditions
 * 
 * @param query - Query template with {{WHERE_CONDITIONS}} placeholder
 * @param conditions - Array of WHERE conditions
 * @returns Query with conditions injected
 */
export function injectWhereConditions(query: string, conditions: string[]): string {
  if (conditions.length === 0) {
    return query.replace('{{WHERE_CONDITIONS}}', '').replace('{{AND_CONDITIONS}}', '')
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const andClause = `AND ${conditions.join(' AND ')}`
  return query
    .replace('{{WHERE_CONDITIONS}}', whereClause)
    .replace('{{AND_CONDITIONS}}', andClause)
}
