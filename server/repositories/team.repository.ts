import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import { buildOrderByClause, type SortParams, type SortConfig } from '../utils/sorting'
import { buildCreateChanges } from '../utils/audit-diff'

const teamSortConfig: SortConfig = {
  allowedFields: {
    name: 't.name',
    responsibilityArea: 't.responsibilityArea',
    memberCount: 'memberCount'
  },
  defaultOrderBy: 't.name ASC'
}

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
  type: string | null
  vendor: string | null
  time: string | null
  approvedAt: string | null
  deprecatedAt: string | null
  eolDate: string | null
  migrationTarget: string | null
  notes: string | null
  approvedBy: string | null
}

export interface VersionApproval {
  technology: string
  version: string
  type: string | null
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

export interface TeamConstraint {
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

export interface TeamConstraintsResult {
  team: string
  enforced: TeamConstraint[]
  subjectTo: TeamConstraint[]
  enforcedCount: number
  subjectToCount: number
}

export interface TechnologyUsage {
  technology: string
  type: string | null
  domain: string | null
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
  type: string | null
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
  async findAll(sort?: SortParams): Promise<Team[]> {
    let query = await loadQuery('teams/find-all.cypher')
    const orderBy = buildOrderByClause(sort || {}, teamSortConfig)
    query = query.replace(/ORDER BY .+$/, `ORDER BY ${orderBy}`)
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
   * Create a new team
   *
   * @param params - Team creation parameters
   * @returns Created team name
   */
  async create(params: {
    name: string
    email: string | null
    responsibilityArea: string | null
    userId: string
  }): Promise<string> {
    const query = await loadQuery('teams/create.cypher')
    const changes = JSON.stringify(buildCreateChanges({
      name: params.name,
      email: params.email,
      responsibilityArea: params.responsibilityArea,
    }))
    const { records } = await this.executeQuery(query, { ...params, changes })
    return records[0]!.get('name')
  }

  /**
   * Update a team
   *
   * @param params - Team update parameters
   * @returns Updated team name
   */
  async update(params: {
    name: string
    newName: string
    email: string | null
    responsibilityArea: string | null
    changedFields: string[]
    changes: Record<string, { before: unknown; after: unknown }>
    userId: string
  }): Promise<string> {
    const query = await loadQuery('teams/update.cypher')
    const { records } = await this.executeQuery(query, { ...params, changes: JSON.stringify(params.changes) })
    if (records.length === 0) {
      throw new Error(`Team '${params.name}' not found`)
    }
    return records[0]!.get('name')
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
  async delete(name: string, userId: string, changes: Record<string, { before: unknown; after: unknown }>): Promise<void> {
    const query = await loadQuery('teams/delete.cypher')
    await this.executeQuery(query, { name, userId, changes: JSON.stringify(changes) })
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
   * Find constraints for a team (enforced and subject to)
   * 
   * @param teamName - Team name
   * @returns Team constraints result
   */
  async findConstraints(teamName: string): Promise<TeamConstraintsResult> {
    // Get enforced constraints
    const enforcedQuery = await loadQuery('teams/find-enforced-policies.cypher')
    const { records: enforcedRecords } = await this.executeQuery(enforcedQuery, { teamName })
    
    const enforcedConstraints = enforcedRecords.map(record => this.mapToConstraint(record))
    
    // Get subject-to constraints
    const subjectQuery = await loadQuery('teams/find-subject-policies.cypher')
    const { records: subjectRecords } = await this.executeQuery(subjectQuery, { teamName })
    
    const subjectToConstraints = subjectRecords.map(record => this.mapToConstraint(record, true))
    
    return {
      team: teamName,
      enforced: enforcedConstraints,
      subjectTo: subjectToConstraints,
      enforcedCount: enforcedConstraints.length,
      subjectToCount: subjectToConstraints.length
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
      type: record.get('type'),
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
      type: record.get('type'),
      domain: record.get('domain'),
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
   * Find all team names
   *
   * @returns Array of team names
   */
  async findAllNames(): Promise<string[]> {
    const query = await loadQuery('teams/find-all-names.cypher')
    const { records } = await this.executeQuery(query)
    return records.map(record => record.get('name')).filter(Boolean)
  }

  /**
   * Check if any of the given teams own a specific system
   *
   * @param teamNames - List of team names to check
   * @param systemName - System name
   * @returns True if at least one team owns the system
   */
  async ownsSystem(teamNames: string[], systemName: string): Promise<boolean> {
    const query = await loadQuery('teams/owns-system.cypher')
    const { records } = await this.executeQuery(query, { teamNames, resourceName: systemName })
    return records[0]?.get('hasAccess') || false
  }

  /**
   * Check if any of the given teams steward a specific technology
   *
   * @param teamNames - List of team names to check
   * @param technologyName - Technology name
   * @returns True if at least one team stewards the technology
   */
  async stewardsTechnology(teamNames: string[], technologyName: string): Promise<boolean> {
    const query = await loadQuery('teams/stewards-technology.cypher')
    const { records } = await this.executeQuery(query, { teamNames, resourceName: technologyName })
    return records[0]?.get('hasAccess') || false
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
      systemCount: record.get('systemCount').toNumber(),
      memberCount: this.toNumber(record.get('memberCount'))
    }
  }

  /**
   * Map Neo4j record to TeamConstraint domain object
   */
  private mapToConstraint(record: Neo4jRecord, includeEnforcer = false): TeamConstraint {
    const constraint: TeamConstraint = {
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
      constraint.enforcedBy = record.get('enforcedBy')
    }
    
    return constraint
  }
}
