import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Technology } from '~~/types/api'

export interface TechnologyDetail extends Technology {
  ownerTeamEmail?: string | null
  components?: Array<{
    name: string
    version: string
    packageManager: string | null
  }>
  systems?: string[]
  policies?: Array<{
    name: string
    severity: string
    ruleType: string
  }>
  technologyApprovals?: Array<{
    team: string
    time: string | null
    approvedAt: string | null
    deprecatedAt: string | null
    eolDate: string | null
    migrationTarget: string | null
    notes: string | null
    approvedBy: string | null
    versionConstraint: string | null
  }>
  versionApprovals?: Array<{
    team: string
    version: string
    time: string | null
    approvedAt: string | null
    deprecatedAt: string | null
    eolDate: string | null
    migrationTarget: string | null
    notes: string | null
    approvedBy: string | null
  }>
}

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
   * Find a technology by name with detailed information
   * 
   * Includes versions, components, systems, policies, and approvals.
   * 
   * @param name - Technology name
   * @returns Technology detail or null if not found
   */
  async findByName(name: string): Promise<TechnologyDetail | null> {
    const query = await loadQuery('technologies/find-by-name.cypher')
    const { records } = await this.executeQuery(query, { name })
    
    if (records.length === 0) {
      return null
    }
    
    return this.mapToTechnologyDetail(records[0])
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

  /**
   * Map Neo4j record to TechnologyDetail domain object
   */
  private mapToTechnologyDetail(record: Neo4jRecord): TechnologyDetail {
    return {
      name: record.get('name'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      approvedVersionRange: record.get('approvedVersionRange'),
      ownerTeam: record.get('ownerTeam'),
      riskLevel: record.get('riskLevel'),
      lastReviewed: record.get('lastReviewed')?.toString(),
      ownerTeamName: record.get('ownerTeamName'),
      ownerTeamEmail: record.get('ownerTeamEmail'),
      versions: record.get('versions').filter((v: { version?: string }) => v.version),
      approvals: [], // Not used in detail view
      components: record.get('components').filter((c: { name?: string }) => c.name),
      systems: record.get('systems').filter((s: string) => s),
      policies: record.get('policies').filter((p: { name?: string }) => p.name),
      technologyApprovals: record.get('technologyApprovals').filter((a: { team?: string }) => a.team),
      versionApprovals: record.get('versionApprovals').filter((a: { team?: string }) => a.team)
    }
  }
}
