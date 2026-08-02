import type { Driver, QueryResult } from 'neo4j-driver'
import { loadQueryWithAudit } from '../utils/query-loader'
import { logger } from '../utils/logger'

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
   * Write an AuditLog entry (and its :AUDITS link to the governed entity) as
   * a separate, best-effort transaction after the primary mutation has
   * already committed. Never throws — a failure here must not roll back or
   * mask the operation it was recording, mirroring auditFailedOperation()/
   * auditSensitiveRead() in server/utils/audit.ts.
   *
   * @param queryPath - Path to a `{{AUDIT_LOG_WRITE}}`-templated companion query, relative to server/database/queries/
   * @param params - Bound params the companion query expects (entity match key, auditFields inputs)
   */
  protected async attachAuditLogBestEffort(queryPath: string, params: Record<string, unknown>): Promise<void> {
    try {
      const query = await loadQueryWithAudit(queryPath)
      await this.executeQuery(query, params)
    } catch (err) {
      logger.error({ err, queryPath }, 'Failed to write audit log — primary operation already committed and is not affected')
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
