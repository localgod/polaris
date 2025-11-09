import { readFile } from 'fs/promises'
import { resolve } from 'path'

const queryCache = new Map<string, string>()

/**
 * Load a Cypher query from a .cypher file
 * Queries are cached in production for performance
 * 
 * @param path - Relative path from server/database/queries/ (e.g., 'technologies/find-all.cypher')
 * @returns The query string
 */
export async function loadQuery(path: string): Promise<string> {
  if (queryCache.has(path)) {
    return queryCache.get(path)!
  }

  const fullPath = resolve('./server/database/queries', path)
  const query = await readFile(fullPath, 'utf-8')
  
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
    return query.replace('{{WHERE_CONDITIONS}}', '')
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`
  return query.replace('{{WHERE_CONDITIONS}}', whereClause)
}
