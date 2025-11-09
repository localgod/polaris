import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Technology } from '~~/types/api'

/**
 * Repository for technology-related data access
 */
export class TechnologyRepository extends BaseRepository {
  /**
   * Find all technologies with their versions and approvals
   * 
   * @returns Array of technologies
   */
  async findAll(): Promise<Technology[]> {
    const query = await loadQuery('technologies/find-all.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToTechnology(record))
  }

  /**
   * Map Neo4j record to Technology domain object
   */
  private mapToTechnology(record: Neo4jRecord): Technology {
    return {
      name: record.get('name'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      approvedVersionRange: record.get('approvedVersionRange'),
      ownerTeam: record.get('ownerTeam'),
      riskLevel: record.get('riskLevel'),
      lastReviewed: record.get('lastReviewed')?.toString(),
      ownerTeamName: record.get('ownerTeamName'),
      versions: record.get('versions').filter((v: string) => v),
      approvals: record.get('approvals').filter((a: { team?: string }) => a.team)
    }
  }
}
