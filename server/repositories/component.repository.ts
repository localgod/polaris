import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Component, UnmappedComponent } from '~~/types/api'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'

export interface ComponentFilters {
  search?: string
  packageManager?: string
  type?: string
  technology?: string
  license?: string
  hasLicense?: boolean
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const componentSortConfig: SortConfig = {
  allowedFields: {
    name: 'c.name',
    version: 'c.version',
    packageManager: 'c.packageManager',
    type: 'c.type',
    systemCount: 'systemCount',
    technologyName: 'tech.name'
  },
  defaultOrderBy: 'c.packageManager ASC, c.name ASC, c.version ASC'
}

// Fields computed after aggregation (Phase 2) — cannot be used in Phase 1 ORDER BY
const postAggregationFields = new Set(['systemCount'])

/**
 * Repository for component-related data access
 */
export class ComponentRepository extends BaseRepository {
  /**
   * Build WHERE conditions and params from filters.
   *
   * Conditions are split into two groups:
   * - componentConditions: reference only `c` properties, safe to place
   *   before OPTIONAL MATCHes (avoids scoping issues in Cypher)
   * - joinConditions: reference variables from OPTIONAL MATCH (tech, l),
   *   must be placed after those matches
   */
  private buildFilterConditions(filters: ComponentFilters): {
    componentConditions: string[]
    joinConditions: string[]
    params: Record<string, unknown>
  } {
    const componentConditions: string[] = []
    const joinConditions: string[] = []
    const params: Record<string, unknown> = {}

    if (filters.search) {
      componentConditions.push('(toLower(c.name) CONTAINS toLower($search) OR toLower(c.purl) CONTAINS toLower($search) OR toLower(COALESCE(c.group, \'\')) CONTAINS toLower($search))')
      params.search = filters.search
    }

    if (filters.packageManager) {
      componentConditions.push('c.packageManager = $packageManager')
      params.packageManager = filters.packageManager
    }

    if (filters.type) {
      componentConditions.push('c.type = $type')
      params.type = filters.type
    }

    if (filters.technology) {
      joinConditions.push('tech.name = $technology')
      params.technology = filters.technology
    }

    if (filters.license) {
      joinConditions.push('l.id = $license')
      params.license = filters.license
      // Filtering by a specific license implies hasLicense=true, so
      // ignore hasLicense to avoid contradictory conditions (e.g.,
      // license=MIT AND l IS NULL can never match).
    } else if (filters.hasLicense !== undefined) {
      if (filters.hasLicense) {
        joinConditions.push('l IS NOT NULL')
      } else {
        joinConditions.push('l IS NULL')
      }
    }

    return { componentConditions, joinConditions, params }
  }

  /**
   * Return the license MATCH clause for the filter phase.
   *
   * Only included when the WHERE clause references `l`:
   * - Required MATCH when filtering by a specific license ID
   * - OPTIONAL MATCH when filtering by license presence (hasLicense)
   * - Empty when no license filtering is needed (avoids row multiplication)
   */
  private buildLicenseMatch(filters: ComponentFilters): string {
    if (filters.license) {
      return 'MATCH (c)-[:HAS_LICENSE]->(l:License)'
    }
    if (filters.hasLicense !== undefined) {
      return 'OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)'
    }
    return ''
  }

  /**
   * Inject dynamic placeholders into a loaded query template.
   */
  private injectPlaceholders(
    query: string,
    replacements: Record<string, string>
  ): string {
    let result = query
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replaceAll(placeholder, value)
    }
    return result
  }

  /**
   * Find all components with their metadata and total count in a single query.
   *
   * Loads the base query from find-all.cypher and injects dynamic
   * WHERE conditions, license MATCH, and pagination. The total count
   * is computed before pagination so only one round-trip is needed.
   */
  async findAll(filters: ComponentFilters = {}): Promise<{ data: Component[]; total: number }> {
    const baseQuery = await loadQuery('components/find-all.cypher')
    const { componentConditions, joinConditions, params } = this.buildFilterConditions(filters)

    const componentWhere = componentConditions.length > 0
      ? `WHERE ${componentConditions.join(' AND ')}`
      : ''

    const joinWhere = joinConditions.length > 0
      ? `WHERE ${joinConditions.join(' AND ')}`
      : ''

    let pagination = ''
    if (filters.limit !== undefined) {
      pagination = 'SKIP toInteger($offset) LIMIT toInteger($limit)'
      params.offset = filters.offset || 0
      params.limit = filters.limit
    }

    const orderBy = buildOrderByClause(
      { sortBy: filters.sortBy, sortOrder: filters.sortOrder },
      componentSortConfig
    )

    // When sorting by a post-aggregation field (e.g. systemCount), compute it
    // before the collect/unwind/pagination step so ORDER BY can reference it.
    const isPostAggSort = filters.sortBy && postAggregationFields.has(filters.sortBy)
    let preAggregation = ''
    let preAggCollect = ''
    let preAggUnwind = ''
    let preOrderBy = orderBy

    if (isPostAggSort) {
      preAggregation = 'OPTIONAL MATCH (sys:System)-[:USES]->(c)\nWITH c, tech, count(DISTINCT sys) as preSystemCount'
      preAggCollect = ', preSystemCount: preSystemCount'
      preAggUnwind = ', row.preSystemCount as preSystemCount'
      preOrderBy = orderBy.replace('systemCount', 'preSystemCount')
    }

    const cypher = this.injectPlaceholders(baseQuery, {
      '{{COMPONENT_WHERE}}': componentWhere,
      '{{LICENSE_MATCH}}': this.buildLicenseMatch(filters),
      '{{JOIN_WHERE}}': joinWhere,
      '{{PRE_AGGREGATION}}': preAggregation,
      '{{PRE_AGG_COLLECT}}': preAggCollect,
      '{{PRE_AGG_UNWIND}}': preAggUnwind,
      '{{PRE_ORDER_BY}}': preOrderBy,
      '{{ORDER_BY}}': orderBy,
      '{{PAGINATION}}': pagination
    })

    const { records } = await this.executeQuery(cypher, params)
    const total = records.length > 0 ? records[0].get('total').toNumber() : 0
    return {
      data: records.map(record => this.mapToComponent(record)),
      total
    }
  }

  /**
   * Find unmapped components with database-level pagination.
   *
   * Results are ordered by system count (most used first) to help
   * prioritize mapping efforts.
   */
  async findUnmapped(limit: number = 50, offset: number = 0, sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<UnmappedComponent[]> {
    let query = await loadQuery('components/find-unmapped.cypher')
    const unmappedSortConfig: SortConfig = {
      allowedFields: {
        name: 'c.name',
        version: 'c.version',
        packageManager: 'c.packageManager',
        system: 'size(systems)'
      },
      defaultOrderBy: 'size(systems) DESC, c.name ASC'
    }
    const orderBy = buildOrderByClause(sort || {}, unmappedSortConfig)
    query = query.replace(/ORDER BY .+\n/, `ORDER BY ${orderBy}\n`)
    const { records } = await this.executeQuery(query, { limit, offset })
    
    return records.map(record => this.mapToUnmappedComponent(record))
  }

  /**
   * Count all unmapped components.
   */
  async countUnmapped(): Promise<number> {
    const query = await loadQuery('components/count-unmapped.cypher')
    const { records } = await this.executeQuery(query)
    return records[0]?.get('total')?.toNumber() || 0
  }

  /**
   * Map Neo4j record to Component domain object
   */
  private mapToComponent(record: Neo4jRecord): Component {
    return {
      name: record.get('name'),
      version: record.get('version'),
      packageManager: record.get('packageManager'),
      purl: record.get('purl'),
      cpe: record.get('cpe'),
      bomRef: record.get('bomRef'),
      type: record.get('type'),
      group: record.get('group'),
      scope: record.get('scope'),
      hashes: record.get('hashes').filter((h: { algorithm?: string; value?: string }) => h.algorithm),
      licenses: record.get('licenses').filter((l: { id?: string; name?: string }) => l.id || l.name),
      copyright: record.get('copyright'),
      supplier: record.get('supplier'),
      author: record.get('author'),
      publisher: record.get('publisher'),
      description: record.get('description'),
      homepage: record.get('homepage'),
      externalReferences: record.get('externalReferences').filter((r: { type?: string; url?: string }) => r.type),
      releaseDate: record.get('releaseDate')?.toString(),
      publishedDate: record.get('publishedDate')?.toString(),
      modifiedDate: record.get('modifiedDate')?.toString(),
      technologyName: record.get('technologyName'),
      systemCount: record.get('systemCount').toNumber()
    }
  }

  /**
   * Map Neo4j record to UnmappedComponent domain object
   */
  private mapToUnmappedComponent(record: Neo4jRecord): UnmappedComponent {
    return {
      name: record.get('name'),
      version: record.get('version'),
      packageManager: record.get('packageManager'),
      purl: record.get('purl'),
      cpe: record.get('cpe'),
      type: record.get('type'),
      group: record.get('group'),
      hashes: record.get('hashes').filter((h: { algorithm?: string; value?: string }) => h.algorithm),
      licenses: record.get('licenses').filter((l: { id?: string; name?: string }) => l.id || l.name),
      systems: record.get('systems').filter((s: string) => s),
      systemCount: record.get('systemCount').toNumber()
    }
  }
}
