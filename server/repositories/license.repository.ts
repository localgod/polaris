import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

export interface License {
  id: string
  name: string
  spdxId: string
  osiApproved: boolean | null
  url: string | null
  category: string | null
  text: string | null
  deprecated: boolean
  createdAt: string
  updatedAt: string
  componentCount?: number
}

export interface LicenseFilters {
  category?: string
  osiApproved?: boolean
  deprecated?: boolean
  search?: string
}

/**
 * Repository for license-related data access
 */
export class LicenseRepository extends BaseRepository {
  /**
   * Find all licenses with optional filtering
   * 
   * @param filters - Optional filters to apply
   * @returns Array of licenses
   */
  async findAll(filters: LicenseFilters = {}): Promise<License[]> {
    const conditions: string[] = []
    const params: Record<string, unknown> = {}
    
    if (filters.category) {
      conditions.push('l.category = $category')
      params.category = filters.category
    }
    
    if (filters.osiApproved !== undefined) {
      conditions.push('l.osiApproved = $osiApproved')
      params.osiApproved = filters.osiApproved
    }
    
    if (filters.deprecated !== undefined) {
      conditions.push('l.deprecated = $deprecated')
      params.deprecated = filters.deprecated
    }
    
    if (filters.search) {
      conditions.push('(toLower(l.id) CONTAINS toLower($search) OR toLower(l.name) CONTAINS toLower($search))')
      params.search = filters.search
    }
    
    let cypher = `MATCH (l:License)`
    
    if (conditions.length > 0) {
      cypher += ` WHERE ${conditions.join(' AND ')}`
    }
    
    cypher += `
      OPTIONAL MATCH (c:Component)-[:HAS_LICENSE]->(l)
      WITH l, count(DISTINCT c) as componentCount
      RETURN 
        l.id as id,
        l.name as name,
        l.spdxId as spdxId,
        l.osiApproved as osiApproved,
        l.url as url,
        l.category as category,
        l.text as text,
        l.deprecated as deprecated,
        l.createdAt as createdAt,
        l.updatedAt as updatedAt,
        componentCount
      ORDER BY componentCount DESC, l.id
    `
    
    const { records } = await this.executeQuery(cypher, params)
    return records.map(record => this.mapToLicense(record))
  }

  /**
   * Find a license by ID
   * 
   * @param id - License ID (SPDX identifier)
   * @returns License or null if not found
   */
  async findById(id: string): Promise<License | null> {
    const cypher = `
      MATCH (l:License {id: $id})
      OPTIONAL MATCH (c:Component)-[:HAS_LICENSE]->(l)
      WITH l, count(DISTINCT c) as componentCount
      RETURN 
        l.id as id,
        l.name as name,
        l.spdxId as spdxId,
        l.osiApproved as osiApproved,
        l.url as url,
        l.category as category,
        l.text as text,
        l.deprecated as deprecated,
        l.createdAt as createdAt,
        l.updatedAt as updatedAt,
        componentCount
    `
    
    const { records } = await this.executeQuery(cypher, { id })
    
    if (records.length === 0) {
      return null
    }
    
    return this.mapToLicense(records[0])
  }

  /**
   * Check if a license exists
   * 
   * @param id - License ID
   * @returns True if license exists
   */
  async exists(id: string): Promise<boolean> {
    const cypher = `
      MATCH (l:License {id: $id})
      RETURN count(l) > 0 as exists
    `
    
    const { records } = await this.executeQuery(cypher, { id })
    return records[0]?.get('exists') || false
  }

  /**
   * Get license statistics
   * 
   * @returns License statistics
   */
  async getStatistics(): Promise<{
    total: number
    byCategory: Record<string, number>
    osiApproved: number
    deprecated: number
  }> {
    const cypher = `
      MATCH (l:License)
      RETURN 
        count(l) as total,
        count(CASE WHEN l.osiApproved = true THEN 1 END) as osiApproved,
        count(CASE WHEN l.deprecated = true THEN 1 END) as deprecated,
        collect({category: l.category, count: 1}) as categories
    `
    
    const { records } = await this.executeQuery(cypher)
    
    if (records.length === 0) {
      return {
        total: 0,
        byCategory: {},
        osiApproved: 0,
        deprecated: 0
      }
    }
    
    const record = records[0]
    const categories = record.get('categories') as Array<{ category: string; count: number }>
    const byCategory: Record<string, number> = {}
    
    categories.forEach(cat => {
      if (cat.category) {
        byCategory[cat.category] = (byCategory[cat.category] || 0) + 1
      }
    })
    
    return {
      total: record.get('total').toNumber(),
      byCategory,
      osiApproved: record.get('osiApproved').toNumber(),
      deprecated: record.get('deprecated').toNumber()
    }
  }

  /**
   * Map Neo4j record to License domain object
   */
  private mapToLicense(record: Neo4jRecord): License {
    return {
      id: record.get('id'),
      name: record.get('name'),
      spdxId: record.get('spdxId'),
      osiApproved: record.get('osiApproved'),
      url: record.get('url'),
      category: record.get('category'),
      text: record.get('text'),
      deprecated: record.get('deprecated') || false,
      createdAt: record.get('createdAt')?.toString() || '',
      updatedAt: record.get('updatedAt')?.toString() || '',
      componentCount: record.get('componentCount')?.toNumber() || 0
    }
  }
}
