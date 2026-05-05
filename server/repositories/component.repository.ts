import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Component } from '~~/types/api'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'

export interface ComponentFilters {
  search?: string
  packageManager?: string
  type?: string
  technology?: string
  license?: string
  hasLicense?: boolean
  system?: string
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
   * All conditions reference only `c` and are applied before any OPTIONAL MATCH.
   * Join-based filters (technology, license, hasLicense) use EXISTS subqueries so
   * that a WHERE clause after an OPTIONAL MATCH is never needed — in Cypher, WHERE
   * after OPTIONAL MATCH applies only to the optional pattern and does not filter rows.
   */
  private buildFilterConditions(filters: ComponentFilters): {
    componentConditions: string[]
    params: Record<string, unknown>
  } {
    const componentConditions: string[] = []
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

    if (filters.system) {
      componentConditions.push('EXISTS { MATCH (sys:System {name: $system})-[:USES]->(c) }')
      params.system = filters.system
    }

    if (filters.technology) {
      componentConditions.push('EXISTS { MATCH (c)-[:IS_VERSION_OF]->(:Technology {name: $technology}) }')
      params.technology = filters.technology
    }

    if (filters.license) {
      componentConditions.push('EXISTS { MATCH (c)-[:HAS_LICENSE]->(:License {id: $license}) }')
      params.license = filters.license
    } else if (filters.hasLicense !== undefined) {
      if (filters.hasLicense) {
        componentConditions.push('EXISTS { (c)-[:HAS_LICENSE]->(:License) }')
      } else {
        componentConditions.push('NOT EXISTS { (c)-[:HAS_LICENSE]->(:License) }')
      }
    }

    return { componentConditions, params }
  }

  /**
   * Return the license MATCH clause for the filter phase.
   *
   * Only included when the WHERE clause references `l`:
   * - Required MATCH when filtering by a specific license ID
   * - OPTIONAL MATCH when filtering by license presence (hasLicense)
   * - Empty when no license filtering is needed (avoids row multiplication)
   */
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
    const { componentConditions, params } = this.buildFilterConditions(filters)

    const componentWhere = componentConditions.length > 0
      ? `WHERE ${componentConditions.join(' AND ')}`
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
      hashes: (record.get('hashes') ?? []).filter((h: { algorithm?: string; value?: string }) => h.algorithm),
      licenses: (record.get('licenses') ?? []).filter((l: { id?: string; name?: string }) => l.id || l.name),
      copyright: record.get('copyright'),
      supplier: record.get('supplier'),
      author: record.get('author'),
      publisher: record.get('publisher'),
      description: record.get('description'),
      homepage: record.get('homepage'),
      externalReferences: (record.get('externalReferences') ?? []).filter((r: { type?: string; url?: string }) => r.type),
      releaseDate: record.get('releaseDate')?.toString(),
      publishedDate: record.get('publishedDate')?.toString(),
      modifiedDate: record.get('modifiedDate')?.toString(),
      technologyName: record.get('technologyName'),
      systemCount: record.get('systemCount').toNumber()
    }
  }

}
