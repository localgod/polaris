import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'
import { loadQuery, injectWhereConditions, injectOrderBy, injectPlaceholder } from '../utils/query-loader'

export interface ViolationFilters {
  severity?: string
  team?: string
  technology?: string
  system?: string
  /** Restrict to direct dependencies only (USES {isDirect: true}) */
  directOnly?: boolean
  /** Restrict to a specific dependency scope on the USES edge */
  depScope?: string
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
  limit?: number
  offset?: number
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
  systemBusinessCriticality: string | null
  systemEnvironment: string | null
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
  realUserId?: string | null
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
  realUserId?: string | null
}

export interface UpdateStatusResult {
  constraint: VersionConstraint
  previousStatus: string
}

export class VersionConstraintRepository extends BaseRepository {

  async findAll(filters: VersionConstraintFilters = {}): Promise<{ data: VersionConstraint[]; total: number }> {
    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0

    const conditions: string[] = []
    const params: Record<string, unknown> = { limit, offset }

    if (filters.scope) {
      conditions.push('vc.scope = $scope')
      params.scope = filters.scope
    }

    if (filters.status) {
      conditions.push('vc.status = $status')
      params.status = filters.status
    }

    const orderBy = buildOrderByClause({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, sortConfig)
    let query = await loadQuery('version-constraints/find-all.cypher')
    query = injectWhereConditions(query, conditions)
    query = injectOrderBy(query, orderBy)

    const { records } = await this.executeQuery(query, params)

    const totalCount = records.length > 0 ? records[0]!.get('total').toNumber() : 0
    return { data: records.map(record => this.mapToConstraint(record)), total: totalCount }
  }

  async findViolations(filters: ViolationFilters): Promise<Violation[]> {
    const query = await loadQuery('version-constraints/find-violations.cypher')

    const params: Record<string, unknown> = {
      directOnly: filters.directOnly ?? null,
      depScope: filters.depScope ?? null,
    }
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
    const { records } = await this.executeQuery(await loadQuery('version-constraints/check-exists.cypher'), { name })
    return records.length > 0
  }

  async getCreator(name: string): Promise<string | null> {
    const { records } = await this.executeQuery(await loadQuery('version-constraints/get-creator.cypher'), { name })
    if (records.length === 0) return null
    return records[0]!.get('createdBy') || null
  }

  async delete(name: string, userId: string, realUserId?: string | null): Promise<void> {
    await this.executeQuery(await loadQuery('version-constraints/delete.cypher'), { name, userId, realUserId: realUserId ?? null })
  }

  async create(input: CreateVersionConstraintInput): Promise<CreateVersionConstraintResult> {
    await this.executeQuery(await loadQuery('version-constraints/create.cypher'), {
      name: input.name,
      description: input.description?.trim() || null,
      severity: input.severity,
      scope: input.scope || 'organization',
      subjectTeam: input.subjectTeam?.trim() || null,
      versionRange: input.versionRange,
      status: input.status || 'active',
      userId: input.userId,
      realUserId: input.realUserId ?? null
    })

    let relationshipsCreated = 0

    // SUBJECT_TO relationships
    if (input.scope === 'team' && input.subjectTeam) {
      const { records } = await this.executeQuery(await loadQuery('version-constraints/link-subject-team.cypher'), { name: input.name, subjectTeam: input.subjectTeam })
      relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
    } else {
      const { records } = await this.executeQuery(await loadQuery('version-constraints/link-all-teams.cypher'), { name: input.name })
      relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
    }

    // GOVERNS relationship
    if (input.governsTechnology) {
      const { records } = await this.executeQuery(await loadQuery('version-constraints/link-governs.cypher'), { name: input.name, technology: input.governsTechnology })
      relationshipsCreated += records[0]?.get('count')?.toNumber() || 0
    }

    const constraint = await this.findByName(input.name)
    if (!constraint) {
      throw new Error('Failed to create version constraint')
    }

    return { constraint, relationshipsCreated }
  }

  async updateStatus(name: string, input: UpdateStatusInput, userId?: string, realUserId?: string | null): Promise<UpdateStatusResult> {
    const current = await this.findByName(name)
    if (!current) {
      throw createError({ statusCode: 404, message: `Version constraint '${name}' not found` })
    }

    const previousStatus = current.status
    const newStatus = input.status || current.status

    await this.executeQuery(await loadQuery('version-constraints/update-status.cypher'), {
      name,
      status: newStatus,
      reason: input.reason?.trim() || null,
      previousStatus,
      newStatus,
      userId: userId || 'anonymous',
      realUserId: realUserId ?? null
    })

    const updated = await this.findByName(name)
    if (!updated) {
      throw new Error('Failed to fetch updated version constraint')
    }

    return { constraint: updated, previousStatus }
  }

  async update(name: string, input: UpdateVersionConstraintInput): Promise<VersionConstraint> {
    const setClauses: string[] = ['vc.updatedAt = datetime()']
    const params: Record<string, unknown> = { name, userId: input.userId, realUserId: input.realUserId ?? null }

    if (input.description !== undefined) {
      setClauses.push('vc.description = $description')
      params.description = input.description?.trim() || null
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

    const updateQuery = injectPlaceholder(
      await loadQuery('version-constraints/update.cypher'),
      'SET_CLAUSES', setClauses.join(', ')
    )
    await this.executeQuery(updateQuery, params)

    // Update SUBJECT_TO relationships if scope changed
    if (input.scope !== undefined) {
      await this.executeQuery(await loadQuery('version-constraints/remove-subject-teams.cypher'), { name })

      if (input.scope === 'team' && input.subjectTeam) {
        await this.executeQuery(await loadQuery('version-constraints/link-subject-team.cypher'), { name, subjectTeam: input.subjectTeam })
      } else {
        await this.executeQuery(await loadQuery('version-constraints/link-all-teams.cypher'), { name })
      }
    }

    // Update GOVERNS relationship if governsTechnology changed
    if (input.governsTechnology !== undefined) {
      await this.executeQuery(await loadQuery('version-constraints/remove-governs.cypher'), { name })

      if (input.governsTechnology) {
        await this.executeQuery(await loadQuery('version-constraints/link-governs.cypher'), { name, technology: input.governsTechnology })
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
      systemBusinessCriticality: record.get('systemBusinessCriticality') || null,
      systemEnvironment: record.get('systemEnvironment') || null,
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
