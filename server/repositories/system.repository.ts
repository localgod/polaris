import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { UnmappedComponent, Repository } from '~~/types/api'

export interface System {
  name: string
  domain: string | null
  ownerTeam: string | null
  businessCriticality: string | null
  environment: string | null
  sourceCodeType: string | null
  hasSourceAccess: boolean | null
  componentCount: number
  repositoryCount: number
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
  sourceCodeType: string
  hasSourceAccess: boolean
  repositories: RepositoryInput[]
}

export interface UnmappedComponentsResult {
  system: string
  components: UnmappedComponent[]
  count: number
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
  async findAll(): Promise<System[]> {
    const query = await loadQuery('systems/find-all.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToSystem(record))
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
    const { records } = await this.executeQuery(query, params)
    
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
  async delete(name: string): Promise<void> {
    const query = await loadQuery('systems/delete.cypher')
    await this.executeQuery(query, { name })
  }

  /**
   * Find unmapped components for a specific system
   * 
   * @param systemName - System name
   * @returns Unmapped components result
   */
  async findUnmappedComponents(systemName: string): Promise<UnmappedComponentsResult> {
    const query = await loadQuery('systems/find-unmapped-components.cypher')
    const { records } = await this.executeQuery(query, { systemName })
    
    const components: UnmappedComponent[] = records.map(record => ({
      name: record.get('name'),
      version: record.get('version'),
      packageManager: record.get('packageManager'),
      purl: record.get('purl'),
      cpe: record.get('cpe'),
      type: record.get('type'),
      group: record.get('group'),
      hashes: record.get('hashes').filter((h: { algorithm?: string; value?: string }) => h.algorithm),
      licenses: record.get('licenses').filter((l: { id?: string; name?: string }) => l.id || l.name)
    }))
    
    return {
      system: systemName,
      components,
      count: components.length
    }
  }

  /**
   * Add a repository to a system using MERGE
   * 
   * @param systemName - System name
   * @param url - Normalized repository URL
   * @param name - Repository name
   * @returns Created/updated repository
   */
  async addRepository(systemName: string, url: string, name: string): Promise<Repository> {
    const query = await loadQuery('systems/add-repository.cypher')
    const { records } = await this.executeQuery(query, {
      systemName,
      url,
      name
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
      sourceCodeType: record.has('sourceCodeType') ? record.get('sourceCodeType') : null,
      hasSourceAccess: record.has('hasSourceAccess') ? record.get('hasSourceAccess') : null,
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
    
    return system
  }
}
