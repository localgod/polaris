import type { Driver, QueryResult } from 'neo4j-driver'

/**
 * Base repository class providing common database operations
 * All repositories should extend this class
 */
export abstract class BaseRepository {
  // When an injected driver is provided (tests), store it directly.
  // Otherwise keep undefined and resolve via useDriver() on first use,
  // so the nuxt-neo4j plugin has time to initialise _driver before any
  // query runs (avoids "Cannot access '_driver' before initialization").
  private _injectedDriver: Driver | undefined

  constructor(driver?: Driver) {
    this._injectedDriver = driver
  }

  protected get driver(): Driver {
    return this._injectedDriver ?? useDriver()
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
