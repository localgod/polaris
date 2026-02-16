import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'

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
  reason: string | null
  source: string
  userId: string | null
  userName: string | null
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
    
    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : ''
    
    const orderBy = buildOrderByClause({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, auditLogSortConfig)
    const query = `
      MATCH (a:AuditLog)
      ${whereClause}
      OPTIONAL MATCH (performer:User {id: a.userId})
      RETURN a, performer.name AS performerName
      ORDER BY ${orderBy}
      SKIP $offset
      LIMIT $limit
    `
    
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
    
    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : ''
    
    const query = `
      MATCH (a:AuditLog)
      ${whereClause}
      RETURN count(a) as count
    `
    
    const { records } = await this.executeQuery(query, params)
    return records[0]?.get('count')?.toNumber() || 0
  }

  /**
   * Get distinct entity types for filtering
   */
  async getEntityTypes(): Promise<string[]> {
    const query = `
      MATCH (a:AuditLog)
      RETURN DISTINCT a.entityType as entityType
      ORDER BY entityType
    `
    
    const { records } = await this.executeQuery(query)
    return records.map(r => r.get('entityType')).filter(Boolean)
  }

  /**
   * Get distinct operations for filtering
   */
  async getOperations(): Promise<string[]> {
    const query = `
      MATCH (a:AuditLog)
      RETURN DISTINCT a.operation as operation
      ORDER BY operation
    `
    
    const { records } = await this.executeQuery(query)
    return records.map(r => r.get('operation')).filter(Boolean)
  }

  private mapToAuditLog(record: Neo4jRecord): AuditLog {
    const a = record.get('a')
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
      reason: a.properties.reason || null,
      source: a.properties.source || '',
      userId: a.properties.userId || null,
      userName: record.get('performerName') || null
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
    source?: string
    userId: string
  }): Promise<void> {
    await this.executeQuery(`
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: $operation,
        entityType: $entityType,
        entityId: $entityId,
        entityLabel: $entityLabel,
        changedFields: $changedFields,
        source: $source,
        userId: $userId
      })
    `, {
      operation: params.operation,
      entityType: params.entityType,
      entityId: params.entityId,
      entityLabel: params.entityLabel,
      changedFields: params.changedFields || [],
      source: params.source || 'API',
      userId: params.userId
    })
  }
}
