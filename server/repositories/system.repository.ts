import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Repository } from '~~/types/api'
import { buildOrderByClause, type SortParams, type SortConfig } from '../utils/sorting'
import { injectWhereConditions } from '../utils/query-loader'
import { buildCreateChanges } from '../utils/audit-diff'

const systemSortConfig: SortConfig = {
  allowedFields: {
    name: 's.name',
    businessCriticality: 's.businessCriticality',
    environment: 's.environment',
    ownerTeam: 'team.name',
    componentCount: 'componentCount',
    repositoryCount: 'repositoryCount'
  },
  defaultOrderBy: 's.businessCriticality DESC, s.name ASC'
}

export interface System {
  name: string
  domain: string | null
  ownerTeam: string | null
  businessCriticality: string | null
  environment: string | null
  componentCount: number
  repositoryCount: number
}

export interface GraphComponentRow {
  systemName: string
  name: string | null
  version: string | null
  packageManager: string | null
  purl: string | null
  cpe: string | null
  type: string | null
  group: string | null
  scope: string | null
  description: string | null
  licenses: Array<{ id?: string; name?: string; allowed?: boolean }>
  technologyName: string | null
  /** True when this component is a direct dependency of the system root (USES {isDirect: true}) */
  direct: boolean
  /** PURLs of components this component directly depends on (within the same system) */
  dependsOnPurls: string[]
}

export interface RepositoryInput {
  url: string
  name: string
  isPublic?: boolean
}

export interface CreateSystemParams {
  name: string
  domain: string
  ownerTeam: string
  businessCriticality: string
  environment: string
  repositories: RepositoryInput[]
  userId: string
  realUserId?: string | null
}


/**
 * Repository for system-related data access
 */
export class SystemRepository extends BaseRepository {
  /**
   * Find all systems with their metadata and counts
   * 
   * Results are ordered by business criticality (critical first) then by name.
   * 
   * @returns Array of systems
   */
  async findAll(sort?: SortParams, limit = 50, offset = 0, search?: string): Promise<{ data: System[]; total: number }> {
    const [dataQuery, countQuery] = await Promise.all([
      loadQuery('systems/find-all.cypher'),
      loadQuery('systems/count.cypher')
    ])
    const orderBy = buildOrderByClause(sort || {}, systemSortConfig)
    const conditions = search ? [`toLower(s.name) CONTAINS toLower($search)`] : []

    const finalDataQuery = injectOrderBy(injectWhereConditions(dataQuery, conditions), orderBy)
    const finalCountQuery = injectWhereConditions(countQuery, conditions)

    const params: Record<string, unknown> = { limit, offset }
    if (search) params.search = search
    const countParams: Record<string, unknown> = search ? { search } : {}

    const [{ records }, { records: countRecords }] = await Promise.all([
      this.executeQuery(finalDataQuery, params),
      this.executeQuery(finalCountQuery, countParams)
    ])

    const total = countRecords[0]?.get('total')?.toNumber() ?? 0
    return { data: records.map(record => this.mapToSystem(record)), total }
  }

  /**
   * Find a system by name
   * 
   * @param name - System name
   * @returns System or null if not found
   */
  async findByName(name: string): Promise<System | null> {
    const query = await loadQuery('systems/find-by-name.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    if (records.length === 0) {
      return null
    }
    
    return this.mapToSystemDetail(records[0]!)
  }

  /**
   * Find a system by repository URL
   * 
   * Searches for a system that has a HAS_SOURCE_IN relationship
   * to a repository with the given URL.
   * 
   * @param url - Repository URL (should be normalized)
   * @returns System name or null if not found
   */
  async findByRepositoryUrl(url: string): Promise<{ name: string } | null> {
    const query = await loadQuery('systems/find-by-repository-url.cypher')
    const { records } = await this.executeQuery(query, { url })
    
    if (records.length === 0) {
      return null
    }
    
    return { name: records[0]!.get('name') }
  }

  /**
   * Check if a system exists
   * 
   * @param name - System name
   * @returns True if system exists
   */
  async exists(name: string): Promise<boolean> {
    const query = await loadQuery('systems/check-exists.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    return records.length > 0
  }

  /**
   * Create a new system with optional repositories
   * 
   * @param params - System creation parameters
   * @returns Created system name
   */
  async create(params: CreateSystemParams): Promise<string> {
    const query = await loadQuery('systems/create.cypher')
    const changes = JSON.stringify(buildCreateChanges({
      name: params.name,
      domain: params.domain,
      businessCriticality: params.businessCriticality,
      environment: params.environment,
    }))
    const { records } = await this.executeQuery(query, { ...params, realUserId: params.realUserId ?? null, changes })
    
    if (records.length === 0) {
      throw new Error('Failed to create system')
    }
    
    return records[0]!.get('name')
  }

  /**
   * Delete a system and all its relationships
   * 
   * @param name - System name
   */
  async delete(name: string, userId: string, changes: Record<string, { before: unknown; after: unknown }>, realUserId?: string | null): Promise<void> {
    const query = await loadQuery('systems/delete.cypher')
    await this.executeQuery(query, { name, userId, realUserId: realUserId ?? null, changes: JSON.stringify(changes) })
  }

  /**
   * Add a repository to a system using MERGE
   * 
   * @param systemName - System name
   * @param url - Normalized repository URL
   * @param name - Repository name
   * @returns Created/updated repository
   */
  async addRepository(systemName: string, url: string, name: string, userId: string, realUserId?: string | null): Promise<Repository> {
    const query = await loadQuery('systems/add-repository.cypher')
    const { records } = await this.executeQuery(query, {
      systemName,
      url,
      name,
      userId,
      realUserId: realUserId ?? null
    })

    if (records.length === 0) {
      throw new Error('Failed to add repository')
    }

    const record = records[0]!
    return {
      url: record.get('url'),
      name: record.get('name'),
      createdAt: record.get('createdAt')?.toString() || null,
      updatedAt: record.get('updatedAt')?.toString() || null,
      lastSbomScanAt: record.get('lastSbomScanAt')?.toString() || null,
      systemCount: 1
    }
  }

  /**
   * Get graph data for a system: all components and their technology links.
   *
   * Returns null when the system does not exist.
   * Returns an empty array when the system exists but has no components.
   *
   * @param name - System name
   * @returns Array of component rows with technology info, or null if system not found
   */
  async getGraph(name: string): Promise<GraphComponentRow[] | null> {
    const query = await loadQuery('systems/graph.cypher')
    const { records } = await this.executeQuery(query, { name })

    // Zero rows → system not found
    if (records.length === 0) return null

    // One row with c.name = null → system exists but has no components
    if (records.length === 1 && records[0]!.get('name') === null) return []

    return records.map(record => ({
      systemName: record.get('systemName') as string,
      name: record.get('name') as string | null,
      version: record.get('version') as string | null,
      packageManager: record.get('packageManager') as string | null,
      purl: record.get('purl') as string | null,
      cpe: record.get('cpe') as string | null,
      type: record.get('type') as string | null,
      group: record.get('group') as string | null,
      scope: record.get('scope') as string | null,
      description: record.get('description') as string | null,
      licenses: (record.get('licenses') as Array<{ id?: string; name?: string; allowed?: boolean }>) ?? [],
      technologyName: record.get('technologyName') as string | null,
      direct: (record.get('direct') as boolean) ?? false,
      dependsOnPurls: (record.get('dependsOnPurls') as string[]) ?? [],
    }))
  }

  /**
   * Get all repositories linked to a system
   * 
   * @param systemName - System name
   * @returns Array of repositories
   */
  async getRepositories(systemName: string): Promise<Repository[]> {
    const query = await loadQuery('systems/get-repositories.cypher')
    const { records } = await this.executeQuery(query, { systemName })

    return records.map(record => ({
      url: record.get('url'),
      name: record.get('name'),
      createdAt: record.get('createdAt')?.toString() || null,
      updatedAt: record.get('updatedAt')?.toString() || null,
      lastSbomScanAt: record.get('lastSbomScanAt')?.toString() || null,
      systemCount: 1
    }))
  }

  /**
   * Map Neo4j record to System domain object (list view)
   */
  private mapToSystem(record: Neo4jRecord): System {
    return {
      name: record.get('name'),
      domain: record.get('domain'),
      ownerTeam: record.get('ownerTeam'),
      businessCriticality: record.get('businessCriticality'),
      environment: record.get('environment'),
      componentCount: record.get('componentCount').toNumber(),
      repositoryCount: record.get('repositoryCount').toNumber()
    }
  }

  /**
   * Map Neo4j record to System domain object (detail view)
   */
  private mapToSystemDetail(record: Neo4jRecord): System {
    const system = record.get('system')
    
    // Convert Neo4j Integer objects to regular numbers
    if (system.componentCount && typeof system.componentCount === 'object' && 'low' in system.componentCount) {
      system.componentCount = system.componentCount.toNumber ? system.componentCount.toNumber() : system.componentCount.low
    }
    if (system.repositoryCount && typeof system.repositoryCount === 'object' && 'low' in system.repositoryCount) {
      system.repositoryCount = system.repositoryCount.toNumber ? system.repositoryCount.toNumber() : system.repositoryCount.low
    }
    // Convert Neo4j DateTime to ISO string
    if (system.lastSbomScanAt && typeof system.lastSbomScanAt === 'object' && 'toString' in system.lastSbomScanAt) {
      system.lastSbomScanAt = system.lastSbomScanAt.toString()
    }
    
    return system
  }
}
