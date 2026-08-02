import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

export interface ComplianceViolation {
  team: string
  technology: string
  type: string
  systemCount: number
  systems: string[]
  violationType: string
  notes: string | null
  migrationTarget: string | null
  waiver: { id: string; reason: string; expiresAt: string } | null
}

/**
 * Repository for compliance-related data access
 */
export interface ComplianceViolationFilters {
  /** Restrict to technologies used via direct dependencies only */
  directOnly?: boolean
  /** Restrict to technologies used via dependencies with this scope */
  depScope?: string
  /** Include violations with an active waiver (excluded by default) */
  includeWaived?: boolean
}

export class ComplianceRepository extends BaseRepository {
  /**
   * Find all compliance violations.
   *
   * A compliance violation occurs when:
   * - A team uses a technology without approval (unapproved)
   * - A team uses a technology marked for elimination (eliminated)
   *
   * Results are ordered by system count (most impactful first).
   */
  async findViolations(filters: ComplianceViolationFilters = {}): Promise<ComplianceViolation[]> {
    const query = await loadQuery('compliance/find-violations.cypher')
    const { records } = await this.executeQuery(query, {
      directOnly: filters.directOnly ?? null,
      depScope: filters.depScope ?? null,
      includeWaived: filters.includeWaived ?? false,
    })

    return records.map(record => this.mapToViolation(record))
  }

  /**
   * Map Neo4j record to ComplianceViolation domain object
   */
  private mapToViolation(record: Neo4jRecord): ComplianceViolation {
    return {
      team: record.get('team'),
      technology: record.get('technology'),
      type: record.get('type'),
      systemCount: record.get('systemCount')?.toNumber() || 0,
      systems: record.get('systems'),
      violationType: record.get('violationType'),
      notes: record.get('notes'),
      migrationTarget: record.get('migrationTarget'),
      waiver: record.get('waiverId')
        ? { id: record.get('waiverId'), reason: record.get('waiverReason'), expiresAt: record.get('waiverExpiresAt')?.toString() || '' }
        : null
    }
  }
}
