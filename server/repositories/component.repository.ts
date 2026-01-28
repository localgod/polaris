import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Component, UnmappedComponent } from '~~/types/api'

export interface ComponentFilters {
  search?: string
  packageManager?: string
  type?: string
  technology?: string
  license?: string
  hasLicense?: boolean
  limit?: number
  offset?: number
}

/**
 * Repository for component-related data access
 */
export class ComponentRepository extends BaseRepository {
  /**
   * Find all components with their metadata
   * 
   * Supports filtering by:
   * - search: Filter by name or purl (case-insensitive contains)
   * - packageManager: Exact match on package manager
   * - type: Exact match on component type
   * - technology: Filter by mapped technology name
   * - license: Filter by license SPDX ID
   * - hasLicense: Filter by license presence
   * - limit/offset: Pagination support
   * 
   * @param filters - Optional filters to apply
   * @returns Array of components
   */
  async findAll(filters: ComponentFilters = {}): Promise<Component[]> {
    // Build dynamic query
    let cypher = `
      MATCH (c:Component)
      OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(t:Technology)
      OPTIONAL MATCH (s:System)-[:USES]->(c)
    `
    
    // Use required MATCH for license filter, OPTIONAL otherwise
    if (filters.license) {
      cypher += `MATCH (c)-[:HAS_LICENSE]->(l:License)`
    } else {
      cypher += `OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)`
    }
    
    // Build WHERE conditions
    const conditions: string[] = []
    const params: Record<string, unknown> = {}
    
    if (filters.search) {
      conditions.push('(toLower(c.name) CONTAINS toLower($search) OR toLower(c.purl) CONTAINS toLower($search))')
      params.search = filters.search
    }
    
    if (filters.packageManager) {
      conditions.push('c.packageManager = $packageManager')
      params.packageManager = filters.packageManager
    }
    
    if (filters.type) {
      conditions.push('c.type = $type')
      params.type = filters.type
    }
    
    if (filters.technology) {
      conditions.push('t.name = $technology')
      params.technology = filters.technology
    }
    
    if (filters.license) {
      conditions.push('l.id = $license')
      params.license = filters.license
    }
    
    if (filters.hasLicense !== undefined) {
      if (filters.hasLicense) {
        conditions.push('l IS NOT NULL')
      } else {
        conditions.push('l IS NULL')
      }
    }
    
    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      cypher += ` WHERE ${conditions.join(' AND ')}`
    }
    
    // Continue with aggregation and return
    cypher += `
      WITH c, t.name as technologyName, collect(DISTINCT s.name) as systems, 
           collect(DISTINCT {id: l.id, name: l.name, url: l.url, text: l.text}) as licenses
      RETURN 
        c.name as name,
        c.version as version,
        c.packageManager as packageManager,
        c.purl as purl,
        c.cpe as cpe,
        c.bomRef as bomRef,
        c.type as type,
        c.group as \`group\`,
        c.scope as scope,
        COALESCE(c.hashes, []) as hashes,
        [lic IN licenses WHERE lic.id IS NOT NULL | lic] as licenses,
        c.copyright as copyright,
        c.supplier as supplier,
        c.author as author,
        c.publisher as publisher,
        c.description as description,
        c.homepage as homepage,
        COALESCE(c.externalReferences, []) as externalReferences,
        c.releaseDate as releaseDate,
        c.publishedDate as publishedDate,
        c.modifiedDate as modifiedDate,
        technologyName,
        size(systems) as systemCount
      ORDER BY c.packageManager, c.name, c.version
    `
    
    // Add pagination
    if (filters.limit !== undefined) {
      cypher += ` SKIP toInteger($offset) LIMIT toInteger($limit)`
      params.offset = filters.offset || 0
      params.limit = filters.limit
    }
    
    const { records } = await this.executeQuery(cypher, params)
    return records.map(record => this.mapToComponent(record))
  }

  /**
   * Count components matching filters (without pagination)
   * 
   * @param filters - Optional filters to apply
   * @returns Total count of matching components
   */
  async count(filters: ComponentFilters = {}): Promise<number> {
    let cypher = `
      MATCH (c:Component)
    `
    
    if (filters.technology) {
      cypher += ` OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(t:Technology)`
    }
    
    if (filters.license) {
      cypher += ` MATCH (c)-[:HAS_LICENSE]->(l:License)`
    } else if (filters.hasLicense !== undefined) {
      cypher += ` OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)`
    }
    
    // Build WHERE conditions (same as findAll)
    const conditions: string[] = []
    const params: Record<string, unknown> = {}
    
    if (filters.search) {
      conditions.push('(toLower(c.name) CONTAINS toLower($search) OR toLower(c.purl) CONTAINS toLower($search))')
      params.search = filters.search
    }
    
    if (filters.packageManager) {
      conditions.push('c.packageManager = $packageManager')
      params.packageManager = filters.packageManager
    }
    
    if (filters.type) {
      conditions.push('c.type = $type')
      params.type = filters.type
    }
    
    if (filters.technology) {
      conditions.push('t.name = $technology')
      params.technology = filters.technology
    }
    
    if (filters.license) {
      conditions.push('l.id = $license')
      params.license = filters.license
    }
    
    if (filters.hasLicense !== undefined) {
      if (filters.hasLicense) {
        conditions.push('l IS NOT NULL')
      } else {
        conditions.push('l IS NULL')
      }
    }
    
    if (conditions.length > 0) {
      cypher += ` WHERE ${conditions.join(' AND ')}`
    }
    
    cypher += ` RETURN count(DISTINCT c) as total`
    
    const { records } = await this.executeQuery(cypher, params)
    return records[0]?.get('total')?.toNumber() || 0
  }

  /**
   * Find all components not mapped to a technology
   * 
   * Results are ordered by system count (most used first) to help
   * prioritize mapping efforts.
   * 
   * @returns Array of unmapped components
   */
  async findUnmapped(): Promise<UnmappedComponent[]> {
    const query = await loadQuery('components/find-unmapped.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToUnmappedComponent(record))
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
