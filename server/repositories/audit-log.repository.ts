import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'
import { loadQuery, injectWhereConditions, injectOrderBy } from '../utils/query-loader'

const auditLogSortConfig: SortConfig = {
  allowedFields: {
    operation: 'a.operation',
    entityType: 'a.entityType',
    entityLabel: 'a.entityLabel',
    userId: 'a.userId',
    timestamp: 'a.timestamp'
  },
  defaultOrderBy: 'a.timestamp DESC'
}

export interface AuditLog {
  id: string
  timestamp: string
  operation: string
  entityType: string
  entityId: string
  entityLabel: string | null
  previousStatus: string | null
  newStatus: string | null
  changedFields: string[]
  changes: Record<string, { before: unknown; after: unknown }> | null
  reason: string | null
  source: string
  userId: string | null
  userName: string | null
  realUserId: string | null
}

export interface AuditLogFilters {
  entityType?: string
  operation?: string
  userId?: string
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export class AuditLogRepository extends BaseRepository {
  /**
   * Find all audit logs with optional filters
   */
  async findAll(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
    const limit = Math.floor(filters.limit || 100)
    const offset = Math.floor(filters.offset || 0)
    
    const whereClauses: string[] = []
    const params: Record<string, unknown> = { limit: neo4j.int(limit), offset: neo4j.int(offset) }
    
    if (filters.entityType) {
      whereClauses.push('a.entityType = $entityType')
      params.entityType = filters.entityType
    }
    
    if (filters.operation) {
      whereClauses.push('a.operation = $operation')
      params.operation = filters.operation
    }
    
    if (filters.userId) {
      whereClauses.push('a.userId = $userId')
      params.userId = filters.userId
    }
    
    const orderBy = buildOrderByClause({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, auditLogSortConfig)
    let query = await loadQuery('audit-logs/find-all.cypher')
    query = injectWhereConditions(query, whereClauses)
    query = injectOrderBy(query, orderBy)

    const { records } = await this.executeQuery(query, params)
    return records.map(record => this.mapToAuditLog(record))
  }

  /**
   * Count audit logs with optional filters
   */
  async count(filters: AuditLogFilters = {}): Promise<number> {
    const whereClauses: string[] = []
    const params: Record<string, unknown> = {}
    
    if (filters.entityType) {
      whereClauses.push('a.entityType = $entityType')
      params.entityType = filters.entityType
    }
    
    if (filters.operation) {
      whereClauses.push('a.operation = $operation')
      params.operation = filters.operation
    }
    
    if (filters.userId) {
      whereClauses.push('a.userId = $userId')
      params.userId = filters.userId
    }
    
    let query = await loadQuery('audit-logs/count.cypher')
    query = injectWhereConditions(query, whereClauses)

    const { records } = await this.executeQuery(query, params)
    return records[0]?.get('count')?.toNumber() || 0
  }

  /**
   * Get distinct entity types for filtering
   */
  async getEntityTypes(): Promise<string[]> {
    const query = await loadQuery('audit-logs/get-entity-types.cypher')
    const { records } = await this.executeQuery(query)
    return records.map(r => r.get('entityType')).filter(Boolean)
  }

  /**
   * Get distinct operations for filtering
   */
  async getOperations(): Promise<string[]> {
    const query = await loadQuery('audit-logs/get-operations.cypher')
    const { records } = await this.executeQuery(query)
    return records.map(r => r.get('operation')).filter(Boolean)
  }

  private mapToAuditLog(record: Neo4jRecord): AuditLog {
    const a = record.get('a')
    // changes is stored as a JSON string (Neo4j does not support nested maps as properties)
    let changes: Record<string, { before: unknown; after: unknown }> | null = null
    const raw = a.properties.changes
    if (typeof raw === 'string' && raw.length > 0) {
      try { changes = JSON.parse(raw) } catch { changes = null }
    }
    return {
      id: a.properties.id,
      timestamp: a.properties.timestamp?.toString() || '',
      operation: a.properties.operation || '',
      entityType: a.properties.entityType || '',
      entityId: a.properties.entityId || '',
      entityLabel: a.properties.entityLabel || null,
      previousStatus: a.properties.previousStatus || null,
      newStatus: a.properties.newStatus || null,
      changedFields: a.properties.changedFields || [],
      changes,
      reason: a.properties.reason || null,
      source: a.properties.source || '',
      userId: a.properties.userId || null,
      userName: record.get('performerName') || null,
      realUserId: a.properties.realUserId || null
    }
  }

  /**
   * Create an audit log entry (standalone, not linked to a graph entity)
   */
  async create(params: {
    operation: string
    entityType: string
    entityId: string
    entityLabel: string
    changedFields?: string[]
    changes?: Record<string, { before: unknown; after: unknown }> | null
    reason?: string | null
    source?: string
    userId: string
    realUserId?: string | null
  }): Promise<void> {
    await this.executeQuery(await loadQuery('audit-logs/create.cypher'), {
      operation: params.operation,
      entityType: params.entityType,
      entityId: params.entityId,
      entityLabel: params.entityLabel,
      changedFields: params.changedFields || [],
      changes: params.changes ? JSON.stringify(params.changes) : null,
      reason: params.reason ?? null,
      source: params.source || 'API',
      userId: params.userId,
      realUserId: params.realUserId ?? null
    })
  }
}
