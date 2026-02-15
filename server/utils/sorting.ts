/**
 * Shared sorting utilities for building dynamic ORDER BY clauses.
 *
 * Each repository defines a map of allowed sort fields to their Cypher
 * expressions. The utility validates the requested field and direction,
 * falling back to a default when the input is invalid.
 */

export interface SortConfig {
  /** Map of client-facing field names to Cypher ORDER BY expressions */
  allowedFields: Record<string, string>
  /** Default ORDER BY clause when no sort is requested */
  defaultOrderBy: string
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Build a validated ORDER BY clause from client sort params.
 *
 * Returns the default if sortBy is missing or not in the allowlist.
 */
export function buildOrderByClause(params: SortParams, config: SortConfig): string {
  if (!params.sortBy || !config.allowedFields[params.sortBy]) {
    return config.defaultOrderBy
  }

  const expression = config.allowedFields[params.sortBy]
  const direction = params.sortOrder === 'desc' ? 'DESC' : 'ASC'
  return `${expression} ${direction}`
}

/**
 * Parse sort query params from an API request.
 */
export function parseSortParams(query: Record<string, unknown>): SortParams {
  const sortBy = query.sortBy as string | undefined
  const rawOrder = (query.sortOrder as string || '').toLowerCase()
  const sortOrder = rawOrder === 'desc' ? 'desc' as const : 'asc' as const

  return { sortBy, sortOrder }
}
