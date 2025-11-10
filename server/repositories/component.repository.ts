import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Component, UnmappedComponent } from '~~/types/api'

/**
 * Repository for component-related data access
 */
export class ComponentRepository extends BaseRepository {
  /**
   * Find all components with their metadata
   * 
   * @returns Array of components
   */
  async findAll(): Promise<Component[]> {
    const query = await loadQuery('components/find-all.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToComponent(record))
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
