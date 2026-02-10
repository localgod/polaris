import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

export interface Team {
  name: string
  email: string | null
  responsibilityArea: string | null
  technologyCount: number
  systemCount: number
  usedTechnologyCount?: number
  memberCount?: number
}

export interface TechnologyApproval {
  technology: string
  category: string | null
  vendor: string | null
  time: string | null
  approvedAt: string | null
  deprecatedAt: string | null
  eolDate: string | null
  migrationTarget: string | null
  notes: string | null
  approvedBy: string | null
  versionConstraint: string | null
}

export interface VersionApproval {
  technology: string
  version: string
  category: string | null
  vendor: string | null
  time: string | null
  approvedAt: string | null
  deprecatedAt: string | null
  eolDate: string | null
  migrationTarget: string | null
  notes: string | null
  approvedBy: string | null
}

export interface TeamApprovalsResult {
  team: string
  technologyApprovals: TechnologyApproval[]
  versionApprovals: VersionApproval[]
}

export interface TeamPolicy {
  name: string
  description: string | null
  ruleType: string
  severity: string
  effectiveDate: string | null
  expiryDate: string | null
  scope: string
  status: string
  enforcedBy?: string | null
  governedTechnologies: string[]
}

export interface TeamPoliciesResult {
  team: string
  enforced: TeamPolicy[]
  subjectTo: TeamPolicy[]
  enforcedCount: number
  subjectToCount: number
}

export interface TechnologyUsage {
  technology: string
  category: string | null
  vendor: string | null
  systemCount: number
  firstUsed: string | null
  lastVerified: string | null
  approvalStatus: string | null
  complianceStatus: string
}

export interface TeamUsageResult {
  team: string
  usage: TechnologyUsage[]
  summary: {
    totalTechnologies: number
    compliant: number
    unapproved: number
    violations: number
    migrationNeeded: number
  }
}

export interface ApprovalStatus {
  team: string
  technology: string
  category: string | null
  vendor: string | null
  version: string | null
  approval: {
    level: 'version' | 'technology' | 'default'
    time: string
    approvedAt?: string | null
    deprecatedAt?: string | null
    eolDate?: string | null
    migrationTarget?: string | null
    notes?: string | null
    approvedBy?: string | null
    versionConstraint?: string | null
  }
}

/**
 * Repository for team-related data access
 */
export class TeamRepository extends BaseRepository {
  /**
   * Find all teams with their counts
   * 
   * @returns Array of teams
   */
  async findAll(): Promise<Team[]> {
    const query = await loadQuery('teams/find-all.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToTeam(record))
  }

  /**
   * Find a team by name with detailed counts
   * 
   * @param name - Team name
   * @returns Team or null if not found
   */
  async findByName(name: string): Promise<Team | null> {
    const query = await loadQuery('teams/find-by-name.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    if (records.length === 0) {
      return null
    }
    
    const team = records[0]!.get('team')
    return {
      name: team.name,
      email: team.email,
      responsibilityArea: team.responsibilityArea,
      technologyCount: this.toNumber(team.technologyCount),
      systemCount: this.toNumber(team.systemCount),
      usedTechnologyCount: this.toNumber(team.usedTechnologyCount),
      memberCount: this.toNumber(team.memberCount)
    }
  }
  
  /**
   * Convert Neo4j Integer to JavaScript number
   */
  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'object' && 'toNumber' in value) {
      return (value as { toNumber: () => number }).toNumber()
    }
    return 0
  }

  /**
   * Check if a team exists
   * 
   * @param name - Team name
   * @returns True if team exists
   */
  async exists(name: string): Promise<boolean> {
    const query = await loadQuery('teams/check-exists.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    return records.length > 0
  }

  /**
   * Count systems owned by a team
   * 
   * @param name - Team name
   * @returns Number of owned systems
   */
  async countOwnedSystems(name: string): Promise<number> {
    const query = await loadQuery('teams/count-owned-systems.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    return records[0]?.get('systemCount').toNumber() || 0
  }

  /**
   * Delete a team and all its relationships
   * 
   * @param name - Team name
   */
  async delete(name: string): Promise<void> {
    const query = await loadQuery('teams/delete.cypher')
    await this.executeQuery(query, { name })
  }

  /**
   * Find all approvals for a team
   * 
   * @param name - Team name
   * @returns Team approvals result
   */
  async findApprovals(name: string): Promise<TeamApprovalsResult> {
    const query = await loadQuery('teams/find-approvals.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    if (records.length === 0) {
      throw new Error(`Team '${name}' not found`)
    }
    
    const record = records[0]!
    
    return {
      team: record.get('teamName'),
      technologyApprovals: record.get('technologyApprovals').filter((a: TechnologyApproval) => a.technology),
      versionApprovals: record.get('versionApprovals').filter((a: VersionApproval) => a.technology)
    }
  }

  /**
   * Find policies for a team (enforced and subject to)
   * 
   * @param teamName - Team name
   * @returns Team policies result
   */
  async findPolicies(teamName: string): Promise<TeamPoliciesResult> {
    // Get enforced policies
    const enforcedQuery = await loadQuery('teams/find-enforced-policies.cypher')
    const { records: enforcedRecords } = await this.executeQuery(enforcedQuery, { teamName })
    
    const enforcedPolicies = enforcedRecords.map(record => this.mapToPolicy(record))
    
    // Get subject-to policies
    const subjectQuery = await loadQuery('teams/find-subject-policies.cypher')
    const { records: subjectRecords } = await this.executeQuery(subjectQuery, { teamName })
    
    const subjectToPolicies = subjectRecords.map(record => this.mapToPolicy(record, true))
    
    return {
      team: teamName,
      enforced: enforcedPolicies,
      subjectTo: subjectToPolicies,
      enforcedCount: enforcedPolicies.length,
      subjectToCount: subjectToPolicies.length
    }
  }

  /**
   * Check approval status for a technology (and optionally version) for a team
   * 
   * @param team - Team name
   * @param technology - Technology name
   * @param version - Optional version
   * @returns Approval status
   */
  async checkApproval(team: string, technology: string, version?: string): Promise<ApprovalStatus | null> {
    const query = await loadQuery('teams/check-approval.cypher')
    const { records } = await this.executeQuery(query, { team, technology, version: version || null })
    
    if (records.length === 0) {
      return null
    }
    
    const record = records[0]!
    
    return {
      team: record.get('teamName'),
      technology: record.get('technologyName'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      version: record.get('version'),
      approval: record.get('approval')
    }
  }

  /**
   * Find technology usage for a team
   * 
   * @param teamName - Team name
   * @returns Team usage result
   */
  async findUsage(teamName: string): Promise<TeamUsageResult> {
    const query = await loadQuery('teams/find-usage.cypher')
    const { records } = await this.executeQuery(query, { teamName })
    
    const usage: TechnologyUsage[] = records.map(record => ({
      technology: record.get('technology'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      systemCount: record.get('systemCount')?.toNumber() || 0,
      firstUsed: record.get('firstUsed')?.toString() || null,
      lastVerified: record.get('lastVerified')?.toString() || null,
      approvalStatus: record.get('approvalStatus') || null,
      complianceStatus: record.get('complianceStatus')
    }))
    
    return {
      team: teamName,
      usage,
      summary: {
        totalTechnologies: usage.length,
        compliant: usage.filter(u => u.complianceStatus === 'compliant').length,
        unapproved: usage.filter(u => u.complianceStatus === 'unapproved').length,
        violations: usage.filter(u => u.complianceStatus === 'violation').length,
        migrationNeeded: usage.filter(u => u.complianceStatus === 'migration-needed').length
      }
    }
  }

  /**
   * Map Neo4j record to Team domain object
   */
  private mapToTeam(record: Neo4jRecord): Team {
    return {
      name: record.get('name'),
      email: record.get('email'),
      responsibilityArea: record.get('responsibilityArea'),
      technologyCount: record.get('technologyCount').toNumber(),
      systemCount: record.get('systemCount').toNumber()
    }
  }

  /**
   * Map Neo4j record to TeamPolicy domain object
   */
  private mapToPolicy(record: Neo4jRecord, includeEnforcer = false): TeamPolicy {
    const policy: TeamPolicy = {
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      scope: record.get('scope'),
      status: record.get('status'),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t)
    }
    
    if (includeEnforcer) {
      policy.enforcedBy = record.get('enforcedBy')
    }
    
    return policy
  }
}
