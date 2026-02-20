import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Technology } from '~~/types/api'
import { buildOrderByClause, type SortParams, type SortConfig } from '../utils/sorting'

const technologySortConfig: SortConfig = {
  allowedFields: {
    name: 't.name',
    category: 't.category',
    ownerTeam: 'team.name'
  },
  defaultOrderBy: 't.category ASC, t.name ASC'
}

export interface UpsertApprovalParams {
  technologyName: string
  teamName: string
  time: string
  approvedBy: string
  notes: string | null
  userId: string
}

export interface UpdateTechnologyParams {
  name: string
  category: string
  vendor: string | null
  ownerTeam: string | null
  lastReviewed: string | null
  userId: string
}

export interface CreateTechnologyParams {
  name: string
  category: string
  vendor: string | null
  ownerTeam: string | null
  componentName: string | null
  componentPackageManager: string | null
  userId: string
}

export interface TechnologyDetail extends Technology {
  ownerTeamEmail?: string | null
  components?: Array<{
    name: string
    version: string
    packageManager: string | null
  }>
  systems?: string[]
  constraints?: Array<{
    name: string
    severity: string
    versionRange: string | null
    status: string
  }>
  technologyApprovals?: Array<{
    team: string
    time: string | null
    approvedAt: string | null
    deprecatedAt: string | null
    eolDate: string | null
    migrationTarget: string | null
    notes: string | null
    approvedBy: string | null
  }>
  versionApprovals?: Array<{
    team: string
    version: string
    time: string | null
    approvedAt: string | null
    deprecatedAt: string | null
    eolDate: string | null
    migrationTarget: string | null
    notes: string | null
    approvedBy: string | null
  }>
}

/**
 * Repository for technology-related data access
 */
export class TechnologyRepository extends BaseRepository {
  /**
   * Find all technologies with their versions and approvals
   * 
   * @returns Array of technologies
   */
  async findAll(sort?: SortParams): Promise<Technology[]> {
    let query = await loadQuery('technologies/find-all.cypher')
    const orderBy = buildOrderByClause(sort || {}, technologySortConfig)
    query = query.replace(/ORDER BY .+$/, `ORDER BY ${orderBy}`)
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToTechnology(record))
  }

  /**
   * Find a technology by name with detailed information
   * 
   * Includes versions, components, systems, constraints, and approvals.
   * 
   * @param name - Technology name
   * @returns Technology detail or null if not found
   */
  async findByName(name: string): Promise<TechnologyDetail | null> {
    const query = await loadQuery('technologies/find-by-name.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    if (records.length === 0) {
      return null
    }
    
    return this.mapToTechnologyDetail(records[0]!)
  }

  /**
   * Check if a technology exists by name
   */
  async exists(name: string): Promise<boolean> {
    const query = await loadQuery('technologies/check-exists.cypher')
    const { records } = await this.executeQuery(query, { name })
    return records.length > 0
  }

  /**
   * Create a new technology, optionally linking a source component
   */
  async create(params: CreateTechnologyParams): Promise<string> {
    const query = await loadQuery('technologies/create.cypher')
    const { records } = await this.executeQuery(query, {
      name: params.name,
      category: params.category,
      vendor: params.vendor || null,
      ownerTeam: params.ownerTeam || null,
      componentName: params.componentName || null,
      componentPackageManager: params.componentPackageManager || null,
      userId: params.userId
    })

    if (records.length === 0) {
      throw new Error('Failed to create technology')
    }

    return records[0]!.get('name')
  }

  /**
   * Find the owner team of a technology
   */
  async findOwnerTeam(name: string): Promise<{ name: string; ownerTeam: string | null } | null> {
    const query = await loadQuery('technologies/find-owner-team.cypher')
    const { records } = await this.executeQuery(query, { name })

    if (records.length === 0) {
      return null
    }

    return {
      name: records[0]!.get('name'),
      ownerTeam: records[0]!.get('ownerTeam')
    }
  }

  async update(params: UpdateTechnologyParams): Promise<string> {
    const query = await loadQuery('technologies/update.cypher')
    const { records } = await this.executeQuery(query, params)
    if (records.length === 0) {
      throw createError({ statusCode: 404, message: `Technology '${params.name}' not found` })
    }
    return records[0]!.get('name')
  }

  async delete(name: string, userId: string): Promise<void> {
    const query = await loadQuery('technologies/delete.cypher')
    await this.executeQuery(query, { name, userId })
  }

  /**
   * Map Neo4j record to Technology domain object
   */
  private mapToTechnology(record: Neo4jRecord): Technology {
    return {
      name: record.get('name'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      lastReviewed: record.get('lastReviewed')?.toString(),
      ownerTeamName: record.get('ownerTeamName'),
      componentCount: record.get('componentCount').toInt(),
      constraintCount: record.get('constraintCount').toInt(),
      versions: record.get('versions').filter((v: string) => v),
      approvals: record.get('approvals').filter((a: { team?: string }) => a.team)
    }
  }

  /**
   * Link a component to a technology via IS_VERSION_OF
   */
  async linkComponent(params: { technologyName: string; componentName: string; componentVersion: string; userId: string }): Promise<{ technologyName: string; componentName: string; componentVersion: string }> {
    const query = await loadQuery('technologies/link-component.cypher')
    const { records } = await this.executeQuery(query, params)

    if (records.length === 0) {
      throw new Error('Failed to link component — technology or component not found')
    }

    return {
      technologyName: records[0]!.get('technologyName'),
      componentName: records[0]!.get('componentName'),
      componentVersion: records[0]!.get('componentVersion')
    }
  }

  /**
   * Create or update a team's APPROVES relationship on a technology
   */
  async upsertApproval(params: UpsertApprovalParams): Promise<{ time: string; team: string }> {
    const query = await loadQuery('technologies/upsert-approval.cypher')
    const { records } = await this.executeQuery(query, params)

    if (records.length === 0) {
      throw new Error('Failed to set approval — technology or team not found')
    }

    return {
      time: records[0]!.get('time'),
      team: records[0]!.get('team')
    }
  }

  /**
   * Convert a Neo4j temporal value to an ISO date string.
   * Handles Neo4j Date, DateTime, and raw {year,month,day} objects.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDateString(val: any): string | null {
    if (!val) return null
    if (typeof val === 'string') return val
    if (typeof val.toString === 'function' && typeof val.year !== 'undefined' && !('low' in val.year)) {
      return val.toString()
    }
    // Raw Neo4j integer objects: {year: {low, high}, month: {low, high}, day: {low, high}, ...}
    const y = val.year?.low ?? val.year
    const m = val.month?.low ?? val.month
    const d = val.day?.low ?? val.day
    if (y != null && m != null && d != null) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return null
  }

  /**
   * Map Neo4j record to TechnologyDetail domain object
   */
  private mapToTechnologyDetail(record: Neo4jRecord): TechnologyDetail {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const versions = record.get('versions').filter((v: { version?: string }) => v.version).map((v: any) => ({
      ...v,
      releaseDate: this.toDateString(v.releaseDate),
      eolDate: this.toDateString(v.eolDate)
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const technologyApprovals = record.get('technologyApprovals').filter((a: { team?: string }) => a.team).map((a: any) => ({
      ...a,
      approvedAt: this.toDateString(a.approvedAt),
      deprecatedAt: this.toDateString(a.deprecatedAt),
      eolDate: this.toDateString(a.eolDate)
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const versionApprovals = record.get('versionApprovals').filter((a: { team?: string }) => a.team).map((a: any) => ({
      ...a,
      approvedAt: this.toDateString(a.approvedAt),
      deprecatedAt: this.toDateString(a.deprecatedAt),
      eolDate: this.toDateString(a.eolDate)
    }))

    return {
      name: record.get('name'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      lastReviewed: record.get('lastReviewed')?.toString(),
      ownerTeamName: record.get('ownerTeamName'),
      ownerTeamEmail: record.get('ownerTeamEmail'),
      versions,
      approvals: [],
      components: record.get('components').filter((c: { name?: string }) => c.name),
      systems: record.get('systems').filter((s: string) => s),
      constraints: record.get('constraints').filter((c: { name?: string }) => c.name),
      technologyApprovals,
      versionApprovals
    }
  }
}
