import type { Record as Neo4jRecord } from 'neo4j-driver'

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
