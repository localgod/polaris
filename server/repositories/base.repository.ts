import type { Driver, QueryResult } from 'neo4j-driver'

/**
 * Base repository class providing common database operations
 * All repositories should extend this class
 */
export abstract class BaseRepository {
  protected driver: Driver

  constructor(driver?: Driver) {
    // Allow driver injection for testing, otherwise use Nuxt composable
    this.driver = driver || useDriver() // Singleton driver from nuxt-neo4j
  }

  /**
   * Execute a Cypher query with parameters
   * 
   * @param query - Cypher query string
   * @param params - Query parameters
   * @returns Query result with records
   */
  protected async executeQuery(
    query: string,
    params: Record<string, unknown> | object = {}
  ): Promise<QueryResult> {
    return await this.driver.executeQuery(query, params)
  }

  /**
   * Execute a Cypher query using a session transaction
   * 
   * This method is useful for complex queries with nested data structures
   * that may not work well with executeQuery.
   * 
   * @param query - Cypher query string
   * @param params - Query parameters
   * @returns Query result with records
   */
  protected async executeQueryWithSession(
    query: string,
    params: Record<string, unknown> | object = {}
  ): Promise<QueryResult> {
    const session = this.driver.session()
    try {
      const result = await session.executeWrite(async tx => {
        return await tx.run(query, params)
      })
      return result
    } finally {
      await session.close()
    }
  }

  /**
   * Close the driver connection
   * Only used in testing - production uses singleton
   */
  async close(): Promise<void> {
    await this.driver.close()
  }
}
