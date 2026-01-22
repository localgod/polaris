import { AuditLogRepository, type AuditLog, type AuditLogFilters } from '../repositories/audit-log.repository'

export interface AuditLogResult {
  data: AuditLog[]
  count: number
  filters: {
    entityTypes: string[]
    operations: string[]
  }
}

export class AuditLogService {
  private auditLogRepo: AuditLogRepository

  constructor() {
    this.auditLogRepo = new AuditLogRepository()
  }

  /**
   * Get audit logs with filters and metadata
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResult> {
    const [data, count, entityTypes, operations] = await Promise.all([
      this.auditLogRepo.findAll(filters),
      this.auditLogRepo.count(filters),
      this.auditLogRepo.getEntityTypes(),
      this.auditLogRepo.getOperations()
    ])

    return {
      data,
      count,
      filters: {
        entityTypes,
        operations
      }
    }
  }
}
