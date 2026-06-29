import { readFile } from 'fs/promises'
import { resolve } from 'path'

const queryCache = new Map<string, string>()

/**
 * Load a Cypher query from a .cypher file.
 *
 * Resolves relative to process.cwd()/server/database/queries/. In the
 * Docker runner image WORKDIR is /app and the query files are copied to
 * /app/server/database/queries/ by the Dockerfile, so this path is correct
 * in both development and production.
 *
 * Queries are cached in production for performance.
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
 * Inject a value into a named placeholder in a query template.
 * Throws if the placeholder is not present, preventing a silent syntax error
 * from reaching Neo4j.
 *
 * @param query - Query template containing {{PLACEHOLDER_NAME}}
 * @param placeholder - Placeholder name without braces (e.g. 'SET_CLAUSES')
 * @param value - Value to substitute
 * @returns Query with placeholder replaced
 */
export function injectPlaceholder(query: string, placeholder: string, value: string): string {
  const token = `{{${placeholder}}}`
  if (!query.includes(token)) {
    throw new Error(`Query template is missing placeholder ${token}`)
  }
  return query.replace(token, value)
}

/**
 * Inject an ORDER BY expression into a query template
 * Replaces {{ORDER_BY}} placeholder with the actual order-by expression
 *
 * @param query - Query template with {{ORDER_BY}} placeholder
 * @param orderBy - ORDER BY expression (e.g. 't.name ASC')
 * @returns Query with order-by injected
 */
export function injectOrderBy(query: string, orderBy: string): string {
  return query.replace('{{ORDER_BY}}', orderBy)
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
