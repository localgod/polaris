import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Component, ComponentDetail, DependencyNode, DependencyScope, GroupedComponent, GroupedComponentVersion, License } from '~~/types/api'
import type { ComponentIdentity } from '~~/utils/component-identity'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'
import semver from 'semver'

export interface ComponentFilters {
  search?: string
  packageManager?: string
  type?: string
  technology?: string
  license?: string
  hasLicense?: boolean
  system?: string
  /** When true, restrict to direct dependencies of the system (requires system to be set) */
  directOnly?: boolean
  /** Filter by dependency scope on the USES edge (e.g. 'runtime', 'dev', 'optional') */
  depScope?: string
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ComponentDependencyFilters {
  system?: string
  scopes?: DependencyScope[]
  maxDepth: number
  limit: number
}

export interface ComponentDependencyTree {
  dependencies: DependencyNode[]
  totalCount: number
  hasCircularDependencies: boolean
  truncated: boolean
  maxDepth: number
  systemExists: boolean
}

interface DependencyPathNode {
  elementId: string
  name: string
  group?: string | null
  version: string
  packageManager?: string | null
  purl?: string | null
  scope?: DependencyScope | null
}

interface DependencyPath {
  nodes: DependencyPathNode[]
}

type MutableDependencyNode = DependencyNode & {
  children: MutableDependencyNode[]
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

const groupedComponentSortConfig: SortConfig = {
  allowedFields: {
    name: 'group.name',
    packageManager: 'group.packageManagerKey',
    type: 'group.primaryType',
    systemCount: 'group.systemCount'
  },
  defaultOrderBy: 'group.packageManagerKey ASC, group.name ASC'
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
      if (filters.directOnly) {
        componentConditions.push('EXISTS { MATCH (sys:System {name: $system})-[:USES {isDirect: true}]->(c) }')
      } else if (filters.depScope) {
        componentConditions.push('EXISTS { MATCH (sys:System {name: $system})-[:USES {scope: $depScope}]->(c) }')
      } else {
        componentConditions.push('EXISTS { MATCH (sys:System {name: $system})-[:USES]->(c) }')
      }
      params.system = filters.system
    }

    if (filters.depScope && !filters.system) {
      // scope filter without a system is not meaningful — ignore silently
    }

    if (filters.directOnly && filters.depScope && filters.system) {
      // both directOnly and depScope: require isDirect=true AND scope matches
      // replace the condition added above with a combined one
      const idx = componentConditions.findLastIndex(c => c.includes('isDirect'))
      if (idx >= 0) {
        componentConditions[idx] = 'EXISTS { MATCH (sys:System {name: $system})-[:USES {isDirect: true, scope: $depScope}]->(c) }'
      }
    }

    if (filters.depScope) {
      params.depScope = filters.depScope
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

    // $system must always be defined — the Phase 2 query uses it to look up
    // scope/isDirect from the USES edge for the filtered system context.
    // When no system filter is active, it resolves to null and the head() returns null.
    if (!params.system) {
      params.system = null
    }

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

  async findAllGrouped(filters: ComponentFilters = {}): Promise<{ data: GroupedComponent[]; total: number }> {
    const baseQuery = await loadQuery('components/find-all-grouped.cypher')
    const { componentConditions, params } = this.buildFilterConditions(filters)

    if (!params.system) {
      params.system = null
    }

    const groupedComponentConditions = componentConditions.map(condition =>
      condition.replace(/\bc\b/g, 'candidate')
    )

    const componentWhere = groupedComponentConditions.length > 0
      ? `WHERE ${groupedComponentConditions.join(' AND ')}`
      : ''

    let pagination = ''
    if (filters.limit !== undefined) {
      pagination = 'SKIP toInteger($offset) LIMIT toInteger($limit)'
      params.offset = filters.offset || 0
      params.limit = filters.limit
    }

    const orderBy = buildOrderByClause(
      { sortBy: filters.sortBy, sortOrder: filters.sortOrder },
      groupedComponentSortConfig
    )

    const cypher = this.injectPlaceholders(baseQuery, {
      '{{COMPONENT_WHERE}}': componentWhere,
      '{{ORDER_BY}}': orderBy,
      '{{PAGINATION}}': pagination
    })

    const { records } = await this.executeQuery(cypher, params)
    const total = records.length > 0 ? records[0].get('total').toNumber() : 0
    return {
      data: records.map(record => this.mapToGroupedComponent(record)),
      total
    }
  }

  async findByIdentity(identity: ComponentIdentity): Promise<ComponentDetail | null> {
    const query = await loadQuery('components/find-by-identity.cypher')
    const params = {
      purl: identity.purl || null,
      name: identity.name || null,
      version: identity.version || null,
      packageManager: identity.packageManager || null,
      group: identity.group || null
    }

    const { records } = await this.executeQuery(query, params)
    if (records.length === 0) return null
    return this.mapToComponentDetail(records[0])
  }

  async findDependencies(
    identity: ComponentIdentity,
    filters: ComponentDependencyFilters
  ): Promise<ComponentDependencyTree | null> {
    const baseQuery = await loadQuery('components/find-dependencies-recursive.cypher')
    const query = this.injectPlaceholders(baseQuery, {
      '{{MAX_DEPTH}}': String(filters.maxDepth)
    })
    const params = {
      purl: identity.purl || null,
      name: identity.name || null,
      version: identity.version || null,
      packageManager: identity.packageManager || null,
      group: identity.group || null,
      system: filters.system || null,
      scopes: filters.scopes ?? [],
      pathLimit: Math.max(filters.limit * filters.maxDepth * 2, filters.limit)
    }

    const { records } = await this.executeQuery(query, params)
    if (records.length === 0) return null

    const record = records[0]
    const root = record.get('root') as DependencyPathNode
    const paths = (record.get('paths') ?? []) as DependencyPath[]

    const tree = this.buildDependencyTree(root, paths, filters.limit)
    const pathCount = record.get('pathCount').toNumber()
    const reachedPathLimit = pathCount >= params.pathLimit

    return {
      ...tree,
      truncated: tree.truncated || reachedPathLimit,
      maxDepth: filters.maxDepth,
      systemExists: record.get('systemExists') as boolean
    }
  }

  private buildDependencyTree(
    root: DependencyPathNode,
    paths: DependencyPath[],
    limit: number
  ): Omit<ComponentDependencyTree, 'maxDepth' | 'systemExists'> {
    const dependencies: MutableDependencyNode[] = []
    const uniqueNodeKeys = new Set<string>()
    const rootKey = this.getDependencyNodeKey(root)
    let hasCircularDependencies = false
    let truncated = false

    for (const path of paths) {
      let siblings = dependencies
      const ancestors = new Set<string>([rootKey])

      for (let index = 0; index < path.nodes.length; index += 1) {
        const pathNode = path.nodes[index]
        if (!pathNode.name || !pathNode.version) break

        const nodeKey = this.getDependencyNodeKey(pathNode)
        const isCircular = ancestors.has(nodeKey)
        let treeNode = siblings.find(node => this.getDependencyNodeKey(node) === nodeKey)

        if (!treeNode) {
          if (!uniqueNodeKeys.has(nodeKey) && uniqueNodeKeys.size >= limit) {
            truncated = true
            break
          }

          treeNode = {
            name: pathNode.name,
            group: pathNode.group ?? null,
            version: pathNode.version,
            packageManager: pathNode.packageManager ?? null,
            purl: pathNode.purl ?? null,
            scope: pathNode.scope ?? null,
            isDirect: index === 0,
            depth: index + 1,
            children: []
          }
          siblings.push(treeNode)
        }

        uniqueNodeKeys.add(nodeKey)

        if (isCircular) {
          treeNode.isCircular = true
          hasCircularDependencies = true
          break
        }

        ancestors.add(nodeKey)
        siblings = treeNode.children
      }
    }

    return {
      dependencies,
      totalCount: uniqueNodeKeys.size,
      hasCircularDependencies,
      truncated
    }
  }

  private getDependencyNodeKey(node: {
    elementId?: string
    purl?: string | null
    packageManager?: string | null
    group?: string | null
    name: string
    version: string
  }): string {
    return node.purl
      ?? node.elementId
      ?? `${node.packageManager ?? ''}:${node.group ?? ''}:${node.name}@${node.version}`
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
      scope: record.get('scope') ?? null,
      isDirect: record.get('isDirect') ?? null,
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

  private mapToGroupedComponent(record: Neo4jRecord): GroupedComponent {
    const versionDetails = ((record.get('versionDetails') ?? []) as Record<string, unknown>[])
      .map(version => this.mapToGroupedComponentVersion(version))
      .sort(compareGroupedVersions)

    const versions = versionDetails.map(version => version.version)
    const licenses = dedupeLicenses(versionDetails.flatMap(version => version.licenses))
    const description = versionDetails.find(version => version.description)?.description ?? null
    const purl = stripPurlVersion(versionDetails.find(version => version.purl)?.purl ?? null)

    return {
      name: record.get('name'),
      group: record.get('group'),
      packageManager: record.get('packageManager'),
      versions,
      versionDetails,
      versionRange: formatVersionRange(versions),
      systemCount: record.get('systemCount').toNumber(),
      licenses,
      types: (record.get('types') ?? []).filter(Boolean),
      primaryType: record.get('primaryType'),
      purl,
      description
    }
  }

  private mapToGroupedComponentVersion(version: Record<string, unknown>): GroupedComponentVersion {
    return {
      name: version.name as string,
      version: version.version as string,
      packageManager: version.packageManager as string | null,
      purl: version.purl as string | null,
      cpe: version.cpe as string | null,
      bomRef: version.bomRef as string | null,
      type: version.type as GroupedComponentVersion['type'],
      group: version.group as string | null,
      scope: (version.scope ?? null) as DependencyScope | null,
      isDirect: (version.isDirect ?? null) as boolean | null,
      licenses: ((version.licenses ?? []) as License[]).filter(license => license.id || license.name),
      homepage: version.homepage as string | null,
      externalReferences: ((version.externalReferences ?? []) as GroupedComponentVersion['externalReferences']).filter(ref => ref.type),
      description: version.description as string | null,
      releaseDate: version.releaseDate?.toString() ?? null,
      publishedDate: version.publishedDate?.toString() ?? null,
      modifiedDate: version.modifiedDate?.toString() ?? null,
      technologyName: version.technologyName as string | null,
      systemCount: toNumber(version.systemCount)
    }
  }

  private mapToComponentDetail(record: Neo4jRecord): ComponentDetail {
    return {
      ...this.mapToComponent(record),
      systems: (record.get('systems') ?? [])
        .filter((system: { name?: string }) => system.name)
        .map((system: { name: string; scope?: string | null; isDirect?: boolean | null }) => ({
          name: system.name,
          scope: system.scope ?? null,
          isDirect: system.isDirect ?? null
        })),
      directDependencies: (record.get('directDependencies') ?? [])
        .filter((dependency: { name?: string; version?: string | null }) => dependency.name && dependency.version)
        .map((dependency: {
          name: string
          group?: string | null
          version: string
          packageManager?: string | null
          purl?: string | null
          scope?: string | null
          isDirect?: boolean
        }) => ({
          name: dependency.name,
          group: dependency.group ?? null,
          version: dependency.version,
          packageManager: dependency.packageManager ?? null,
          purl: dependency.purl ?? null,
          scope: dependency.scope ?? null,
          isDirect: true
        })),
      eol: null,
      packageMetadata: null
    }
  }

}

function compareGroupedVersions(a: GroupedComponentVersion, b: GroupedComponentVersion): number {
  const semverA = semver.valid(a.version)
  const semverB = semver.valid(b.version)

  if (semverA && semverB) {
    return semver.compare(semverA, semverB)
  }

  const dateA = Date.parse(a.publishedDate ?? a.releaseDate ?? '')
  const dateB = Date.parse(b.publishedDate ?? b.releaseDate ?? '')
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
    return dateA - dateB
  }

  return a.version.localeCompare(b.version, undefined, { numeric: true, sensitivity: 'base' })
}

function formatVersionRange(versions: string[]): string | null {
  if (versions.length === 0) return null
  if (versions.length === 1) return versions[0]!
  if (versions.length <= 3) return versions.join(', ')
  return `${versions[0]} - ${versions[versions.length - 1]}`
}

function dedupeLicenses(licenses: License[]): License[] {
  const deduped = new Map<string, License>()
  for (const license of licenses) {
    const key = license.id || license.name
    if (!key || deduped.has(key)) continue
    deduped.set(key, license)
  }
  return [...deduped.values()]
}

function stripPurlVersion(purl: string | null): string | null {
  if (!purl) return null
  const lastSlash = purl.lastIndexOf('/')
  const lastAt = purl.lastIndexOf('@')
  return lastAt > lastSlash ? purl.slice(0, lastAt) : purl
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }
  return 0
}
