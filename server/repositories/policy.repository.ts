import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

export interface ViolationFilters {
  severity?: string
  team?: string
  technology?: string
}

export interface PolicyViolation {
  team: string
  technology: string
  technologyCategory: string
  riskLevel: string
  policy: {
    name: string
    description: string
    severity: string
    ruleType: string
    enforcedBy: string | null
  }
}

/**
 * Repository for policy-related data access
 */
export class PolicyRepository extends BaseRepository {
  /**
   * Find policy violations with optional filters
   * 
   * @param filters - Optional filters for severity, team, and technology
   * @returns Array of policy violations
   */
  async findViolations(filters: ViolationFilters): Promise<PolicyViolation[]> {
    const query = await loadQuery('policies/find-violations.cypher')
    
    const params: Record<string, string> = {}
    const conditions: string[] = []
    
    if (filters.severity) {
      conditions.push('policy.severity = $severity')
      params.severity = filters.severity
    }
    
    if (filters.team) {
      conditions.push('team.name = $team')
      params.team = filters.team
    }
    
    if (filters.technology) {
      conditions.push('tech.name = $technology')
      params.technology = filters.technology
    }
    
    // Inject WHERE conditions into query
    const finalQuery = injectWhereConditions(query, conditions)
    
    const { records } = await this.executeQuery(finalQuery, params)
    
    return records.map(record => this.mapToViolation(record))
  }

  /**
   * Map Neo4j record to PolicyViolation domain object
   */
  private mapToViolation(record: Neo4jRecord): PolicyViolation {
    return {
      team: record.get('teamName'),
      technology: record.get('technologyName'),
      technologyCategory: record.get('technologyCategory'),
      riskLevel: record.get('riskLevel'),
      policy: {
        name: record.get('policyName'),
        description: record.get('policyDescription'),
        severity: record.get('severity'),
        ruleType: record.get('ruleType'),
        enforcedBy: record.get('enforcedBy')
      }
    }
  }
}
