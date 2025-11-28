import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Repository } from '~~/types/api'

/**
 * Repository for source code repository-related data access
 */
export class SourceRepositoryRepository extends BaseRepository {
  /**
   * Find all repositories with their system counts
   * 
   * @returns Array of repositories
   */
  async findAll(): Promise<Repository[]> {
    const query = await loadQuery('source-repositories/find-all.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToRepository(record))
  }

  /**
   * Find a repository by URL
   * 
   * @param url - Repository URL
   * @returns Repository or null if not found
   */
  async findByUrl(url: string): Promise<Repository | null> {
    const query = await loadQuery('source-repositories/find-by-url.cypher')
    const { records } = await this.executeQuery(query, { url })
    
    if (records.length === 0) {
      return null
    }
    
    return this.mapToRepository(records[0])
  }

  /**
   * Update the last SBOM scan timestamp for a repository
   * 
   * @param url - Repository URL
   * @returns void
   */
  async updateLastScan(url: string): Promise<void> {
    const query = await loadQuery('source-repositories/update-last-scan.cypher')
    await this.executeQuery(query, { url })
  }

  /**
   * Map Neo4j record to Repository domain object
   */
  private mapToRepository(record: Neo4jRecord): Repository {
    return {
      url: record.get('url'),
      name: record.get('name'),
      createdAt: record.get('createdAt')?.toString() || null,
      updatedAt: record.get('updatedAt')?.toString() || null,
      lastSbomScanAt: record.get('lastSbomScanAt')?.toString() || null,
      systemCount: record.get('systemCount').toNumber()
    }
  }
}
