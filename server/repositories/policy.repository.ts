import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

export interface ViolationFilters {
  severity?: string
  team?: string
  technology?: string
  system?: string
  license?: string
}

export interface PolicyFilters {
  scope?: string
  status?: string
  enforcedBy?: string
  ruleType?: string
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

export interface LicenseViolation {
  team: string
  system: string
  component: {
    name: string
    version: string
    purl: string
  }
  license: {
    id: string
    name: string
    category: string | null
    osiApproved: boolean | null
  }
  policy: {
    name: string
    description: string
    severity: string
    ruleType: string
    enforcedBy: string | null
  }
}

export interface GovernedVersion {
  technology: string
  version: string
}

export interface Policy {
  name: string
  description: string | null
  ruleType: string
  severity: string
  effectiveDate: string | null
  expiryDate: string | null
  enforcedBy: string
  scope: string
  status: string
  enforcerTeam: string | null
  subjectTeams: string[]
  governedTechnologies: string[]
  governedVersions: GovernedVersion[]
}

/**
 * Repository for policy-related data access
 */
export class PolicyRepository extends BaseRepository {
  /**
   * Find all policies with optional filters
   * 
   * @param filters - Optional filters for scope, status, enforcedBy, and ruleType
   * @returns Array of policies
   */
  async findAll(filters: PolicyFilters = {}): Promise<Policy[]> {
    let cypher = `
      MATCH (p:Policy)
    `
    
    const conditions: string[] = []
    const params: Record<string, string> = {}
    
    if (filters.scope) {
      conditions.push('p.scope = $scope')
      params.scope = filters.scope
    }
    
    if (filters.status) {
      conditions.push('p.status = $status')
      params.status = filters.status
    }
    
    if (filters.enforcedBy) {
      conditions.push('p.enforcedBy = $enforcedBy')
      params.enforcedBy = filters.enforcedBy
    }
    
    if (filters.ruleType) {
      conditions.push('p.ruleType = $ruleType')
      params.ruleType = filters.ruleType
    }
    
    if (conditions.length > 0) {
      cypher += ' WHERE ' + conditions.join(' AND ')
    }
    
    cypher += `
      OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
      OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(p)
      OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
      WITH p, enforcer, 
           collect(DISTINCT subject.name) as subjectTeams,
           collect(DISTINCT tech.name) as governedTechnologies
      RETURN p.name as name,
             p.description as description,
             p.ruleType as ruleType,
             p.severity as severity,
             p.effectiveDate as effectiveDate,
             p.expiryDate as expiryDate,
             p.enforcedBy as enforcedBy,
             p.scope as scope,
             p.status as status,
             enforcer.name as enforcerTeam,
             subjectTeams,
             governedTechnologies,
             size(governedTechnologies) as technologyCount
      ORDER BY 
        CASE p.severity
          WHEN 'critical' THEN 1
          WHEN 'error' THEN 2
          WHEN 'warning' THEN 3
          WHEN 'info' THEN 4
        END,
        p.effectiveDate DESC,
        p.name
    `
    
    const { records } = await this.executeQuery(cypher, params)
    
    return records.map(record => this.mapToPolicyList(record))
  }

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
   * Find a policy by name
   * 
   * @param name - Policy name
   * @returns Policy or null if not found
   */
  async findByName(name: string): Promise<Policy | null> {
    const query = await loadQuery('policies/find-by-name.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    if (records.length === 0) {
      return null
    }
    
    return this.mapToPolicy(records[0])
  }

  /**
   * Check if a policy exists
   * 
   * @param name - Policy name
   * @returns True if policy exists
   */
  async exists(name: string): Promise<boolean> {
    const query = await loadQuery('policies/check-exists.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    return records.length > 0
  }

  /**
   * Delete a policy and all its relationships
   * 
   * @param name - Policy name
   */
  async delete(name: string): Promise<void> {
    const query = await loadQuery('policies/delete.cypher')
    await this.executeQuery(query, { name })
  }

  /**
   * Find license compliance violations with optional filters
   * 
   * @param filters - Optional filters for severity, team, system, and license
   * @returns Array of license violations
   */
  async findLicenseViolations(filters: ViolationFilters): Promise<LicenseViolation[]> {
    const query = await loadQuery('policies/find-license-violations.cypher')
    
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
    
    if (filters.system) {
      conditions.push('system.name = $system')
      params.system = filters.system
    }
    
    if (filters.license) {
      conditions.push('license.id = $license')
      params.license = filters.license
    }
    
    // Inject WHERE conditions into query
    const finalQuery = injectWhereConditions(query, conditions)
    
    const { records } = await this.executeQuery(finalQuery, params)
    
    return records.map(record => this.mapToLicenseViolation(record))
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

  /**
   * Map Neo4j record to Policy domain object (for findByName)
   */
  private mapToPolicy(record: Neo4jRecord): Policy {
    return {
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      enforcedBy: record.get('enforcedBy'),
      scope: record.get('scope'),
      status: record.get('status'),
      enforcerTeam: record.get('enforcerTeam'),
      subjectTeams: record.get('subjectTeams').filter((t: string) => t),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t),
      governedVersions: record.get('governedVersions').filter((v: GovernedVersion) => v.technology)
    }
  }

  /**
   * Map Neo4j record to Policy domain object (for findAll)
   */
  private mapToPolicyList(record: Neo4jRecord): Policy {
    return {
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      enforcedBy: record.get('enforcedBy'),
      scope: record.get('scope'),
      status: record.get('status'),
      enforcerTeam: record.get('enforcerTeam'),
      subjectTeams: record.get('subjectTeams').filter((t: string) => t),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t),
      governedVersions: [] // Not included in list view
    }
  }

  /**
   * Map Neo4j record to LicenseViolation domain object
   */
  private mapToLicenseViolation(record: Neo4jRecord): LicenseViolation {
    return {
      team: record.get('teamName'),
      system: record.get('systemName'),
      component: {
        name: record.get('componentName'),
        version: record.get('componentVersion'),
        purl: record.get('componentPurl')
      },
      license: {
        id: record.get('licenseId'),
        name: record.get('licenseName'),
        category: record.get('licenseCategory'),
        osiApproved: record.get('licenseOsiApproved')
      },
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
