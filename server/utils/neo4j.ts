import type { Record as Neo4jRecord } from 'neo4j-driver'
import neo4j from 'neo4j-driver'

/**
 * Convert a Neo4j temporal value to an ISO date string.
 *
 * Accepts Neo4j Date, DateTime, or LocalDateTime instances (identified via the
 * driver's own type-guard predicates) as well as plain strings.  Returns `null`
 * for any value that cannot be converted.
 *
 * @param val - A Neo4j temporal object, a string, or an unknown value
 * @returns An ISO date/date-time string, or `null`
 */
export function toDateString(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') return val
  if (neo4j.isDate(val) || neo4j.isDateTime(val) || neo4j.isLocalDateTime(val)) {
    return val.toString()
  }
  return null
}

/**
 * Get the first record from a Neo4j query result or throw a 404 error
 * 
 * @param records - Array of Neo4j records
 * @param errorMessage - Error message to display if no record found
 * @returns The first record
 * @throws 404 error if no record exists
 */
export function getFirstRecordOrThrow(records: Neo4jRecord[], errorMessage: string): Neo4jRecord {
  const record = records[0]
  
  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: errorMessage
    })
  }
  
  return record
}
