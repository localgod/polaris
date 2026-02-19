import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'

export interface ViolationFilters {
  severity?: string
  team?: string
  technology?: string
  system?: string
  license?: string
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PolicyFilters {
  scope?: string
  status?: string
  enforcedBy?: string
  ruleType?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const policySortConfig: SortConfig = {
  allowedFields: {
    name: 'p.name',
    ruleType: 'p.ruleType',
    severity: "CASE p.severity WHEN 'critical' THEN 1 WHEN 'error' THEN 2 WHEN 'warning' THEN 3 WHEN 'info' THEN 4 END",
    scope: 'p.scope',
    enforcedBy: 'p.enforcedBy',
    status: 'p.status'
  },
  defaultOrderBy: "CASE p.severity WHEN 'critical' THEN 1 WHEN 'error' THEN 2 WHEN 'warning' THEN 3 WHEN 'info' THEN 4 END ASC, p.effectiveDate DESC, p.name ASC"
}

export interface PolicyViolation {
  team: string
  technology: string
  technologyCategory: string
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
  licenseMode?: string | null
  enforcerTeam: string | null
  subjectTeams: string[]
  governedTechnologies: string[]
  governedVersions: GovernedVersion[]
  allowedLicenses?: string[]
  deniedLicenses?: string[]
  technologyCount: number
}

export interface CreatePolicyInput {
  name: string
  description?: string
  ruleType: string
  severity: string
  scope?: string
  status?: string
  enforcedBy?: string
  licenseMode?: 'allowlist' | 'denylist'
  allowedLicenses?: string[]
  deniedLicenses?: string[]
  userId: string
}

export interface CreatePolicyResult {
  policy: Policy
  relationshipsCreated: number
}

export interface UpdatePolicyStatusInput {
  status?: 'active' | 'draft' | 'archived'
  reason?: string
}

export interface UpdatePolicyResult {
  policy: Policy
  previousStatus: string
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
      ORDER BY ${buildOrderByClause({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, policySortConfig)}
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
    
    return this.mapToPolicy(records[0]!)
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
  /**
   * Get the creator of a policy
   */
  async getCreator(name: string): Promise<string | null> {
    const { records } = await this.executeQuery(
      'MATCH (p:Policy {name: $name}) RETURN p.createdBy as createdBy',
      { name }
    )
    if (records.length === 0) return null
    return records[0]!.get('createdBy') || null
  }

  async delete(name: string, userId: string): Promise<void> {
    const query = await loadQuery('policies/delete.cypher')
    await this.executeQuery(query, { name, userId })
  }

  /**
   * Create a new policy
   * 
   * @param input - Policy creation input
   * @returns Created policy and relationship count
   */
  async create(input: CreatePolicyInput): Promise<CreatePolicyResult> {
    // Step 1: Create the policy node
    const createPolicyQuery = `
      CREATE (p:Policy {
        name: $name,
        description: $description,
        ruleType: $ruleType,
        severity: $severity,
        scope: $scope,
        status: $status,
        enforcedBy: $enforcedBy,
        licenseMode: $licenseMode,
        createdBy: $userId,
        effectiveDate: date(),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN p.name as name
    `
    
    await this.executeQuery(createPolicyQuery, {
      name: input.name,
      description: input.description || null,
      ruleType: input.ruleType,
      severity: input.severity,
      scope: input.scope || 'organization',
      status: input.status || 'active',
      enforcedBy: input.enforcedBy || 'Security',
      licenseMode: input.licenseMode || null,
      userId: input.userId
    })

    // Audit log for policy creation
    const auditQuery = `
      MATCH (p:Policy {name: $name})
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: 'CREATE',
        entityType: 'Policy',
        entityId: p.name,
        entityLabel: p.name,
        changedFields: ['name', 'ruleType', 'severity', 'scope', 'status'],
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(p)
    `
    await this.executeQuery(auditQuery, { name: input.name, userId: input.userId })
    
    let relationshipsCreated = 0
    
    // Step 2: Create SUBJECT_TO relationships for organization-scope policies
    if (input.scope === 'organization' || !input.scope) {
      const subjectToQuery = `
        MATCH (p:Policy {name: $name})
        MATCH (team:Team)
        MERGE (team)-[:SUBJECT_TO]->(p)
        RETURN count(*) as count
      `
      const { records } = await this.executeQuery(subjectToQuery, { name: input.name })
      relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
    }
    
    // Step 3: Create ENFORCES relationship if enforcedBy team exists
    if (input.enforcedBy) {
      const enforcesQuery = `
        MATCH (p:Policy {name: $name})
        MATCH (team:Team {name: $enforcedBy})
        MERGE (team)-[:ENFORCES]->(p)
        RETURN count(*) as count
      `
      const { records } = await this.executeQuery(enforcesQuery, { 
        name: input.name, 
        enforcedBy: input.enforcedBy 
      })
      relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
    }
    
    // Step 4: Create license relationships for license-compliance policies
    if (input.ruleType === 'license-compliance') {
      if (input.licenseMode === 'denylist' && input.deniedLicenses?.length) {
        // Create DENIES_LICENSE relationships
        const denyQuery = `
          MATCH (p:Policy {name: $name})
          UNWIND $licenses as licenseId
          MATCH (l:License {id: licenseId})
          MERGE (p)-[:DENIES_LICENSE]->(l)
          RETURN count(*) as count
        `
        const { records } = await this.executeQuery(denyQuery, {
          name: input.name,
          licenses: input.deniedLicenses
        })
        relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
      } else if (input.licenseMode === 'allowlist' && input.allowedLicenses?.length) {
        // Create ALLOWS_LICENSE relationships
        const allowQuery = `
          MATCH (p:Policy {name: $name})
          UNWIND $licenses as licenseId
          MATCH (l:License {id: licenseId})
          MERGE (p)-[:ALLOWS_LICENSE]->(l)
          RETURN count(*) as count
        `
        const { records } = await this.executeQuery(allowQuery, {
          name: input.name,
          licenses: input.allowedLicenses
        })
        relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
      }
    }
    
    // Step 5: Fetch and return the created policy
    const policy = await this.findByName(input.name)
    if (!policy) {
      throw new Error('Failed to create policy')
    }
    
    return {
      policy,
      relationshipsCreated
    }
  }

  /**
   * Update a policy's status
   * 
   * @param name - Policy name
   * @param input - Status update input
   * @param userId - Optional user ID for audit logging
   * @returns Updated policy and previous status
   */
  async updateStatus(name: string, input: UpdatePolicyStatusInput, userId?: string): Promise<UpdatePolicyResult> {
    // Get current status first
    const currentPolicy = await this.findByName(name)
    if (!currentPolicy) {
      throw createError({
        statusCode: 404,
        message: `Policy '${name}' not found`
      })
    }
    
    const previousStatus = currentPolicy.status
    const newStatus = input.status || currentPolicy.status
    
    // Update the policy and create audit log in a single transaction
    const updateQuery = `
      MATCH (p:Policy {name: $name})
      SET p.status = $status,
          p.updatedAt = datetime(),
          p.statusChangedAt = datetime(),
          p.statusChangeReason = $reason
      WITH p
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: CASE $newStatus
          WHEN 'active' THEN 'ACTIVATE'
          WHEN 'archived' THEN 'ARCHIVE'
          ELSE 'DEACTIVATE'
        END,
        entityType: 'Policy',
        entityId: p.name,
        entityLabel: p.name,
        previousStatus: $previousStatus,
        newStatus: $newStatus,
        changedFields: ['status'],
        reason: $reason,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(p)
      RETURN p.name as name
    `
    
    await this.executeQuery(updateQuery, {
      name,
      status: newStatus,
      reason: input.reason || null,
      previousStatus,
      newStatus,
      userId: userId || 'anonymous'
    })
    
    // Fetch and return the updated policy
    const updatedPolicy = await this.findByName(name)
    if (!updatedPolicy) {
      throw new Error('Failed to fetch updated policy')
    }
    
    return {
      policy: updatedPolicy,
      previousStatus
    }
  }

  /**
   * Get or create the organization license policy
   * This is a singleton policy used for managing denied/allowed licenses org-wide
   */
  async getOrCreateOrgLicensePolicy(): Promise<Policy> {
    const policyName = 'Organization License Policy'
    
    // Try to find existing policy
    let policy = await this.findByName(policyName)
    
    if (!policy) {
      // Create the policy
      const createQuery = `
        CREATE (p:Policy {
          name: $name,
          description: 'Organization-wide license compliance policy. Licenses added here are denied across all systems.',
          ruleType: 'license-compliance',
          severity: 'error',
          scope: 'organization',
          status: 'active',
          enforcedBy: 'Security',
          licenseMode: 'denylist',
          effectiveDate: date(),
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN p.name as name
      `
      await this.executeQuery(createQuery, { name: policyName })
      
      // Create SUBJECT_TO relationships for all teams
      const subjectToQuery = `
        MATCH (p:Policy {name: $name})
        MATCH (team:Team)
        MERGE (team)-[:SUBJECT_TO]->(p)
      `
      await this.executeQuery(subjectToQuery, { name: policyName })
      
      // Create ENFORCES relationship
      const enforcesQuery = `
        MATCH (p:Policy {name: $name})
        MATCH (team:Team {name: 'Security'})
        MERGE (team)-[:ENFORCES]->(p)
      `
      await this.executeQuery(enforcesQuery, { name: policyName })
      
      policy = await this.findByName(policyName)
    }
    
    if (!policy) {
      throw new Error('Failed to create organization license policy')
    }
    
    return policy
  }

  /**
   * Add a license to the organization deny list
   */
  async denyLicense(licenseId: string, userId?: string): Promise<{ added: boolean; policy: Policy }> {
    const policy = await this.getOrCreateOrgLicensePolicy()
    
    // Check if already denied
    const checkQuery = `
      MATCH (p:Policy {name: $policyName})-[r:DENIES_LICENSE]->(l:License {id: $licenseId})
      RETURN count(r) as count
    `
    const { records: checkRecords } = await this.executeQuery(checkQuery, {
      policyName: policy.name,
      licenseId
    })
    
    const alreadyDenied = (checkRecords[0]?.get('count')?.toNumber() || 0) > 0
    
    if (alreadyDenied) {
      return { added: false, policy }
    }
    
    // Add the denial relationship and create audit log
    const denyQuery = `
      MATCH (p:Policy {name: $policyName})
      MATCH (l:License {id: $licenseId})
      MERGE (p)-[:DENIES_LICENSE]->(l)
      WITH p, l
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: 'DENY_LICENSE',
        entityType: 'Policy',
        entityId: p.name,
        entityLabel: p.name,
        changedFields: ['deniedLicenses'],
        licenseId: l.id,
        licenseName: l.name,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(p)
      SET p.updatedAt = datetime()
      RETURN p.name as name
    `
    await this.executeQuery(denyQuery, {
      policyName: policy.name,
      licenseId,
      userId: userId || 'anonymous'
    })
    
    // Return updated policy
    const updatedPolicy = await this.findByName(policy.name)
    return { added: true, policy: updatedPolicy! }
  }

  /**
   * Remove a license from the organization deny list
   */
  async allowLicense(licenseId: string, userId?: string): Promise<{ removed: boolean; policy: Policy }> {
    const policy = await this.getOrCreateOrgLicensePolicy()
    
    // Check if currently denied
    const checkQuery = `
      MATCH (p:Policy {name: $policyName})-[r:DENIES_LICENSE]->(l:License {id: $licenseId})
      RETURN count(r) as count
    `
    const { records: checkRecords } = await this.executeQuery(checkQuery, {
      policyName: policy.name,
      licenseId
    })
    
    const isDenied = (checkRecords[0]?.get('count')?.toNumber() || 0) > 0
    
    if (!isDenied) {
      return { removed: false, policy }
    }
    
    // Remove the denial relationship and create audit log
    const allowQuery = `
      MATCH (p:Policy {name: $policyName})-[r:DENIES_LICENSE]->(l:License {id: $licenseId})
      DELETE r
      WITH p, l
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: 'ALLOW_LICENSE',
        entityType: 'Policy',
        entityId: p.name,
        entityLabel: p.name,
        changedFields: ['deniedLicenses'],
        licenseId: l.id,
        licenseName: l.name,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(p)
      SET p.updatedAt = datetime()
      RETURN p.name as name
    `
    await this.executeQuery(allowQuery, {
      policyName: policy.name,
      licenseId,
      userId: userId || 'anonymous'
    })
    
    // Return updated policy
    const updatedPolicy = await this.findByName(policy.name)
    return { removed: true, policy: updatedPolicy! }
  }

  /**
   * Check if a license is denied by the organization policy
   */
  async isLicenseDenied(licenseId: string): Promise<boolean> {
    const query = `
      MATCH (p:Policy {name: 'Organization License Policy', status: 'active'})-[:DENIES_LICENSE]->(l:License {id: $licenseId})
      RETURN count(p) as count
    `
    const { records } = await this.executeQuery(query, { licenseId })
    return (records[0]?.get('count')?.toNumber() || 0) > 0
  }

  /**
   * Get all denied license IDs from the organization policy
   */
  async getDeniedLicenseIds(): Promise<string[]> {
    const query = `
      MATCH (p:Policy {name: 'Organization License Policy', status: 'active'})-[:DENIES_LICENSE]->(l:License)
      RETURN l.id as licenseId
    `
    const { records } = await this.executeQuery(query)
    return records.map(r => r.get('licenseId'))
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

  async findDisabledLicenseViolations(filters: ViolationFilters): Promise<LicenseViolation[]> {
    const query = await loadQuery('policies/find-disabled-license-violations.cypher')

    const params: Record<string, string> = {}
    const conditions: string[] = []

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
    const governedTechnologies = record.get('governedTechnologies').filter((t: string) => t)
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
      licenseMode: record.get('licenseMode'),
      enforcerTeam: record.get('enforcerTeam'),
      subjectTeams: record.get('subjectTeams').filter((t: string) => t),
      governedTechnologies,
      governedVersions: record.get('governedVersions').filter((v: GovernedVersion) => v.technology),
      allowedLicenses: record.get('allowedLicenses')?.filter((l: string) => l) || [],
      deniedLicenses: record.get('deniedLicenses')?.filter((l: string) => l) || [],
      technologyCount: governedTechnologies.length
    }
  }

  /**
   * Map Neo4j record to Policy domain object (for findAll)
   */
  private mapToPolicyList(record: Neo4jRecord): Policy {
    const governedTechnologies = record.get('governedTechnologies').filter((t: string) => t)
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
      governedTechnologies,
      governedVersions: [], // Not included in list view
      technologyCount: governedTechnologies.length
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
