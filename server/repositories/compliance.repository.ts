import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

export interface ComplianceViolation {
  team: string
  technology: string
  category: string
  systemCount: number
  systems: string[]
  violationType: string
  notes: string | null
  migrationTarget: string | null
}

/**
 * Repository for compliance-related data access
 */
export class ComplianceRepository extends BaseRepository {
  /**
   * Find all compliance violations
   * 
   * A compliance violation occurs when:
   * - A team uses a technology without approval (unapproved)
   * - A team uses a technology marked for elimination (eliminated)
   * 
   * Results are ordered by system count (most impactful first).
   * 
   * @returns Array of compliance violations
   */
  async findViolations(): Promise<ComplianceViolation[]> {
    const query = await loadQuery('compliance/find-violations.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToViolation(record))
  }

  /**
   * Map Neo4j record to ComplianceViolation domain object
   */
  private mapToViolation(record: Neo4jRecord): ComplianceViolation {
    return {
      team: record.get('team'),
      technology: record.get('technology'),
      category: record.get('category'),
      systemCount: record.get('systemCount')?.toNumber() || 0,
      systems: record.get('systems'),
      violationType: record.get('violationType'),
      notes: record.get('notes'),
      migrationTarget: record.get('migrationTarget')
    }
  }
}
