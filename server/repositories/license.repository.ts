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
  whitelisted: boolean
  createdAt: string
  updatedAt: string
  componentCount?: number
}

export interface LicenseFilters {
  category?: string
  osiApproved?: boolean
  deprecated?: boolean
  whitelisted?: boolean
  search?: string
  limit?: number
  offset?: number
}

/**
 * Repository for license-related data access
 */
export class LicenseRepository extends BaseRepository {
  /**
   * Count licenses with optional filtering
   * 
   * @param filters - Optional filters to apply
   * @returns Number of licenses matching the filters
   */
  async count(filters: LicenseFilters = {}): Promise<number> {
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
    
    if (filters.whitelisted !== undefined) {
      conditions.push('l.whitelisted = $whitelisted')
      params.whitelisted = filters.whitelisted
    }
    
    if (filters.search) {
      conditions.push('(toLower(l.id) CONTAINS toLower($search) OR toLower(l.name) CONTAINS toLower($search))')
      params.search = filters.search
    }
    
    let cypher = `MATCH (l:License)`
    
    if (conditions.length > 0) {
      cypher += ` WHERE ${conditions.join(' AND ')}`
    }
    
    cypher += ` RETURN count(l) as total`
    
    const { records } = await this.executeQuery(cypher, params)
    return records[0]?.get('total').toNumber() || 0
  }

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
    
    if (filters.whitelisted !== undefined) {
      conditions.push('l.whitelisted = $whitelisted')
      params.whitelisted = filters.whitelisted
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
        l.whitelisted as whitelisted,
        l.createdAt as createdAt,
        l.updatedAt as updatedAt,
        componentCount
      ORDER BY componentCount DESC, l.id
    `
    
    if (filters.limit !== undefined) {
      cypher += ` SKIP toInteger($offset) LIMIT toInteger($limit)`
      params.offset = filters.offset || 0
      params.limit = filters.limit
    }
    
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
        l.whitelisted as whitelisted,
        l.createdAt as createdAt,
        l.updatedAt as updatedAt,
        componentCount
    `
    
    const { records } = await this.executeQuery(cypher, { id })
    
    if (records.length === 0) {
      return null
    }
    
    return this.mapToLicense(records[0]!)
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
    
    const record = records[0]!
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
   * Update whitelist status for a license
   * 
   * @param id - License ID
   * @param whitelisted - New whitelist status
   * @returns True if license was updated
   */
  async updateWhitelistStatus(id: string, whitelisted: boolean, userId?: string): Promise<boolean> {
    const cypher = `
      MATCH (l:License {id: $id})
      WITH l, l.whitelisted as previousWhitelisted
      SET l.whitelisted = $whitelisted,
          l.updatedAt = datetime()
      WITH l, previousWhitelisted
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: CASE $whitelisted WHEN true THEN 'ENABLE' ELSE 'DISABLE' END,
        entityType: 'License',
        entityId: l.id,
        entityLabel: l.name,
        previousStatus: CASE previousWhitelisted WHEN true THEN 'enabled' ELSE 'disabled' END,
        newStatus: CASE $whitelisted WHEN true THEN 'enabled' ELSE 'disabled' END,
        changedFields: ['whitelisted'],
        reason: null,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(l)
      RETURN count(l) as updated
    `
    
    const { records } = await this.executeQuery(cypher, { id, whitelisted, userId: userId || null })
    return records[0]?.get('updated').toNumber() > 0
  }

  /**
   * Get all whitelisted licenses
   * 
   * @returns Array of whitelisted licenses
   */
  async getWhitelistedLicenses(): Promise<License[]> {
    return this.findAll({ whitelisted: true })
  }

  /**
   * Check if a license is whitelisted
   * 
   * @param id - License ID
   * @returns True if license is whitelisted
   */
  async isWhitelisted(id: string): Promise<boolean> {
    const cypher = `
      MATCH (l:License {id: $id})
      RETURN l.whitelisted as whitelisted
    `
    
    const { records } = await this.executeQuery(cypher, { id })
    return records[0]?.get('whitelisted') || false
  }

  /**
   * Bulk update whitelist status for multiple licenses atomically
   * 
   * Uses a transaction to ensure all licenses are updated or none are.
   * Validates that all licenses exist before updating.
   * 
   * @param licenseIds - Array of license IDs
   * @param whitelisted - New whitelist status
   * @returns Number of licenses updated
   * @throws Error if any license does not exist
   */
  async bulkUpdateWhitelistStatus(licenseIds: string[], whitelisted: boolean, userId?: string): Promise<number> {
    if (licenseIds.length === 0) return 0
    
    const cypher = `
      // First, verify all licenses exist
      UNWIND $licenseIds as licenseId
      MATCH (l:License {id: licenseId})
      WITH collect(l) as licenses, $licenseIds as requestedIds
      // This WHERE clause ensures atomicity: if any license doesn't exist,
      // the sizes won't match and the query returns no results (rollback)
      WHERE size(licenses) = size(requestedIds)
      
      // If all exist, update them and create audit logs
      UNWIND licenses as license
      WITH license, license.whitelisted as previousWhitelisted
      SET license.whitelisted = $whitelisted,
          license.updatedAt = datetime()
      WITH license, previousWhitelisted
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: CASE $whitelisted WHEN true THEN 'ENABLE' ELSE 'DISABLE' END,
        entityType: 'License',
        entityId: license.id,
        entityLabel: license.name,
        previousStatus: CASE previousWhitelisted WHEN true THEN 'enabled' ELSE 'disabled' END,
        newStatus: CASE $whitelisted WHEN true THEN 'enabled' ELSE 'disabled' END,
        changedFields: ['whitelisted'],
        reason: null,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(license)
      RETURN count(license) as updated
    `
    
    const { records } = await this.executeQueryWithSession(cypher, { licenseIds, whitelisted, userId: userId || null })
    
    // If no records returned, it means some licenses don't exist
    if (records.length === 0) {
      throw new Error('One or more licenses not found')
    }
    
    const updatedCount = records[0]?.get('updated')?.toNumber() || 0
    
    // Additional check: if we expected to update licenses but got 0, something went wrong
    if (updatedCount === 0 && licenseIds.length > 0) {
      throw new Error('One or more licenses not found')
    }
    
    return updatedCount
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
      whitelisted: record.get('whitelisted') || false,
      createdAt: record.get('createdAt')?.toString() || '',
      updatedAt: record.get('updatedAt')?.toString() || '',
      componentCount: record.get('componentCount')?.toNumber() || 0
    }
  }
}
