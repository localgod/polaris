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
   * Map Neo4j record to Repository domain object
   */
  private mapToRepository(record: Neo4jRecord): Repository {
    return {
      url: record.get('url'),
      scmType: record.get('scmType'),
      name: record.get('name'),
      description: record.get('description'),
      isPublic: record.get('isPublic'),
      requiresAuth: record.get('requiresAuth'),
      defaultBranch: record.get('defaultBranch'),
      createdAt: record.get('createdAt')?.toString() || null,
      lastSyncedAt: record.get('lastSyncedAt')?.toString() || null,
      systemCount: record.get('systemCount').toNumber()
    }
  }
}
