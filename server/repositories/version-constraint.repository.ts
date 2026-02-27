import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'

export interface ViolationFilters {
  severity?: string
  team?: string
  technology?: string
  system?: string
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface VersionConstraintFilters {
  scope?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const sortConfig: SortConfig = {
  allowedFields: {
    name: 'vc.name',
    severity: "CASE vc.severity WHEN 'critical' THEN 1 WHEN 'error' THEN 2 WHEN 'warning' THEN 3 WHEN 'info' THEN 4 END",
    scope: 'vc.scope',
    status: 'vc.status'
  },
  defaultOrderBy: "CASE vc.severity WHEN 'critical' THEN 1 WHEN 'error' THEN 2 WHEN 'warning' THEN 3 WHEN 'info' THEN 4 END ASC, vc.name ASC"
}

export interface Violation {
  team: string
  system: string
  component: string
  componentVersion: string
  technology: string
  technologyType: string
  constraint: {
    name: string
    description: string
    severity: string
    versionRange: string | null
  }
}

export interface VersionConstraint {
  name: string
  description: string | null
  severity: string
  scope: string
  subjectTeam: string | null
  versionRange: string | null
  status: string
  subjectTeams: string[]
  governedTechnologies: string[]
  technologyCount: number
}

export interface CreateVersionConstraintInput {
  name: string
  description?: string
  severity: string
  scope?: string
  subjectTeam?: string
  versionRange: string
  governsTechnology?: string
  status?: string
  userId: string
}

export interface CreateVersionConstraintResult {
  constraint: VersionConstraint
  relationshipsCreated: number
}

export interface UpdateStatusInput {
  status?: 'active' | 'draft' | 'archived'
  reason?: string
}

export interface UpdateVersionConstraintInput {
  description?: string
  severity?: string
  scope?: string
  subjectTeam?: string | null
  versionRange?: string | null
  governsTechnology?: string | null
  status?: string
  userId: string
}

export interface UpdateStatusResult {
  constraint: VersionConstraint
  previousStatus: string
}

export class VersionConstraintRepository extends BaseRepository {

  async findAll(filters: VersionConstraintFilters = {}): Promise<VersionConstraint[]> {
    let cypher = `
      MATCH (vc:VersionConstraint)
    `

    const conditions: string[] = []
    const params: Record<string, string> = {}

    if (filters.scope) {
      conditions.push('vc.scope = $scope')
      params.scope = filters.scope
    }

    if (filters.status) {
      conditions.push('vc.status = $status')
      params.status = filters.status
    }

    if (conditions.length > 0) {
      cypher += ' WHERE ' + conditions.join(' AND ')
    }

    cypher += `
      OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(vc)
      OPTIONAL MATCH (vc)-[:GOVERNS]->(tech:Technology)
      WITH vc,
           collect(DISTINCT subject.name) as subjectTeams,
           collect(DISTINCT tech.name) as governedTechnologies
      RETURN vc.name as name,
             vc.description as description,
             vc.severity as severity,
             vc.scope as scope,
             vc.subjectTeam as subjectTeam,
             vc.versionRange as versionRange,
             vc.status as status,
             subjectTeams,
             governedTechnologies,
             size(governedTechnologies) as technologyCount
      ORDER BY ${buildOrderByClause({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, sortConfig)}
    `

    const { records } = await this.executeQuery(cypher, params)

    return records.map(record => this.mapToConstraint(record))
  }

  async findViolations(filters: ViolationFilters): Promise<Violation[]> {
    const query = await loadQuery('version-constraints/find-violations.cypher')

    const params: Record<string, string> = {}
    const conditions: string[] = []

    if (filters.severity) {
      conditions.push('vc.severity = $severity')
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

    const finalQuery = injectWhereConditions(query, conditions)

    const { records } = await this.executeQuery(finalQuery, params)

    return records.map(record => this.mapToViolation(record))
  }

  async findByName(name: string): Promise<VersionConstraint | null> {
    const query = await loadQuery('version-constraints/find-by-name.cypher')
    const { records } = await this.executeQuery(query, { name })

    if (records.length === 0) {
      return null
    }

    return this.mapToConstraint(records[0]!)
  }

  async exists(name: string): Promise<boolean> {
    const { records } = await this.executeQuery(
      'MATCH (vc:VersionConstraint {name: $name}) RETURN vc.name as name LIMIT 1',
      { name }
    )
    return records.length > 0
  }

  async getCreator(name: string): Promise<string | null> {
    const { records } = await this.executeQuery(
      'MATCH (vc:VersionConstraint {name: $name}) RETURN vc.createdBy as createdBy',
      { name }
    )
    if (records.length === 0) return null
    return records[0]!.get('createdBy') || null
  }

  async delete(name: string, userId: string): Promise<void> {
    await this.executeQuery(`
      MATCH (vc:VersionConstraint {name: $name})
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: 'DELETE',
        entityType: 'VersionConstraint',
        entityId: vc.name,
        entityLabel: vc.name,
        source: 'API',
        userId: $userId
      })
      WITH vc
      DETACH DELETE vc
    `, { name, userId })
  }

  async create(input: CreateVersionConstraintInput): Promise<CreateVersionConstraintResult> {
    await this.executeQuery(`
      CREATE (vc:VersionConstraint {
        name: $name,
        description: $description,
        severity: $severity,
        scope: $scope,
        subjectTeam: $subjectTeam,
        versionRange: $versionRange,
        status: $status,
        createdBy: $userId,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH vc
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: 'CREATE',
        entityType: 'VersionConstraint',
        entityId: vc.name,
        entityLabel: vc.name,
        changedFields: ['name', 'severity', 'scope', 'status', 'versionRange'],
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(vc)
    `, {
      name: input.name,
      description: input.description || null,
      severity: input.severity,
      scope: input.scope || 'organization',
      subjectTeam: input.subjectTeam || null,
      versionRange: input.versionRange,
      status: input.status || 'active',
      userId: input.userId
    })

    let relationshipsCreated = 0

    // SUBJECT_TO relationships
    if (input.scope === 'team' && input.subjectTeam) {
      const { records } = await this.executeQuery(`
        MATCH (vc:VersionConstraint {name: $name})
        MATCH (team:Team {name: $subjectTeam})
        MERGE (team)-[:SUBJECT_TO]->(vc)
        RETURN count(*) as count
      `, { name: input.name, subjectTeam: input.subjectTeam })
      relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
    } else {
      const { records } = await this.executeQuery(`
        MATCH (vc:VersionConstraint {name: $name})
        MATCH (team:Team)
        MERGE (team)-[:SUBJECT_TO]->(vc)
        RETURN count(*) as count
      `, { name: input.name })
      relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
    }

    // GOVERNS relationship
    if (input.governsTechnology) {
      const { records } = await this.executeQuery(`
        MATCH (vc:VersionConstraint {name: $name})
        MATCH (tech:Technology {name: $technology})
        MERGE (vc)-[:GOVERNS]->(tech)
        RETURN count(*) as count
      `, { name: input.name, technology: input.governsTechnology })
      relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
    }

    const constraint = await this.findByName(input.name)
    if (!constraint) {
      throw new Error('Failed to create version constraint')
    }

    return { constraint, relationshipsCreated }
  }

  async updateStatus(name: string, input: UpdateStatusInput, userId?: string): Promise<UpdateStatusResult> {
    const current = await this.findByName(name)
    if (!current) {
      throw createError({ statusCode: 404, message: `Version constraint '${name}' not found` })
    }

    const previousStatus = current.status
    const newStatus = input.status || current.status

    await this.executeQuery(`
      MATCH (vc:VersionConstraint {name: $name})
      SET vc.status = $status,
          vc.updatedAt = datetime(),
          vc.statusChangedAt = datetime(),
          vc.statusChangeReason = $reason
      WITH vc
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: CASE $newStatus
          WHEN 'active' THEN 'ACTIVATE'
          WHEN 'archived' THEN 'ARCHIVE'
          ELSE 'DEACTIVATE'
        END,
        entityType: 'VersionConstraint',
        entityId: vc.name,
        entityLabel: vc.name,
        previousStatus: $previousStatus,
        newStatus: $newStatus,
        changedFields: ['status'],
        reason: $reason,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(vc)
    `, {
      name,
      status: newStatus,
      reason: input.reason || null,
      previousStatus,
      newStatus,
      userId: userId || 'anonymous'
    })

    const updated = await this.findByName(name)
    if (!updated) {
      throw new Error('Failed to fetch updated version constraint')
    }

    return { constraint: updated, previousStatus }
  }

  async update(name: string, input: UpdateVersionConstraintInput): Promise<VersionConstraint> {
    const setClauses: string[] = ['vc.updatedAt = datetime()']
    const params: Record<string, unknown> = { name, userId: input.userId }

    if (input.description !== undefined) {
      setClauses.push('vc.description = $description')
      params.description = input.description || null
    }
    if (input.severity !== undefined) {
      setClauses.push('vc.severity = $severity')
      params.severity = input.severity
    }
    if (input.scope !== undefined) {
      setClauses.push('vc.scope = $scope')
      params.scope = input.scope
    }
    if (input.subjectTeam !== undefined) {
      setClauses.push('vc.subjectTeam = $subjectTeam')
      params.subjectTeam = input.subjectTeam
    }
    if (input.versionRange !== undefined) {
      setClauses.push('vc.versionRange = $versionRange')
      params.versionRange = input.versionRange
    }
    if (input.status !== undefined) {
      setClauses.push('vc.status = $status')
      params.status = input.status
    }

    await this.executeQuery(`
      MATCH (vc:VersionConstraint {name: $name})
      SET ${setClauses.join(', ')}
      WITH vc
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: 'UPDATE',
        entityType: 'VersionConstraint',
        entityId: vc.name,
        entityLabel: vc.name,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(vc)
    `, params)

    // Update SUBJECT_TO relationships if scope changed
    if (input.scope !== undefined) {
      await this.executeQuery(
        'MATCH (t:Team)-[r:SUBJECT_TO]->(vc:VersionConstraint {name: $name}) DELETE r',
        { name }
      )

      if (input.scope === 'team' && input.subjectTeam) {
        await this.executeQuery(
          'MATCH (vc:VersionConstraint {name: $name}) MATCH (t:Team {name: $subjectTeam}) MERGE (t)-[:SUBJECT_TO]->(vc)',
          { name, subjectTeam: input.subjectTeam }
        )
      } else {
        await this.executeQuery(
          'MATCH (vc:VersionConstraint {name: $name}) MATCH (t:Team) MERGE (t)-[:SUBJECT_TO]->(vc)',
          { name }
        )
      }
    }

    // Update GOVERNS relationship if governsTechnology changed
    if (input.governsTechnology !== undefined) {
      await this.executeQuery(
        'MATCH (vc:VersionConstraint {name: $name})-[r:GOVERNS]->(:Technology) DELETE r',
        { name }
      )

      if (input.governsTechnology) {
        await this.executeQuery(
          'MATCH (vc:VersionConstraint {name: $name}) MATCH (tech:Technology {name: $technology}) MERGE (vc)-[:GOVERNS]->(tech)',
          { name, technology: input.governsTechnology }
        )
      }
    }

    const updated = await this.findByName(name)
    if (!updated) {
      throw new Error('Failed to fetch updated version constraint')
    }
    return updated
  }

  private mapToViolation(record: Neo4jRecord): Violation {
    return {
      team: record.get('teamName'),
      system: record.get('systemName'),
      component: record.get('componentName'),
      componentVersion: record.get('componentVersion'),
      technology: record.get('technologyName'),
      technologyType: record.get('technologyType'),
      constraint: {
        name: record.get('constraintName'),
        description: record.get('constraintDescription'),
        severity: record.get('severity'),
        versionRange: record.get('versionRange')
      }
    }
  }

  private mapToConstraint(record: Neo4jRecord): VersionConstraint {
    const governedTechnologies = record.get('governedTechnologies').filter((t: string) => t)
    return {
      name: record.get('name'),
      description: record.get('description'),
      severity: record.get('severity'),
      scope: record.get('scope'),
      subjectTeam: record.get('subjectTeam'),
      versionRange: record.get('versionRange'),
      status: record.get('status'),
      subjectTeams: record.get('subjectTeams').filter((t: string) => t),
      governedTechnologies,
      technologyCount: governedTechnologies.length
    }
  }
}
