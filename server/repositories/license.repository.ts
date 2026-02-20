import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'

export interface License {
  id: string
  name: string
  spdxId: string
  osiApproved: boolean | null
  url: string | null
  category: string | null
  text: string | null
  deprecated: boolean
  allowed: boolean
  createdAt: string
  updatedAt: string
  componentCount?: number
}

export interface LicenseComponent {
  name: string
  version: string
  packageManager: string
  type: string | null
  purl: string | null
  systemCount: number
  technologyName: string | null
}

export interface LicenseViolation {
  teamName: string
  systemName: string
  componentName: string
  componentVersion: string
  componentPurl: string | null
  licenseId: string
  licenseName: string
  licenseCategory: string | null
}

export interface LicenseFilters {
  category?: string
  osiApproved?: boolean
  deprecated?: boolean
  allowed?: boolean
  search?: string
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const licenseSortConfig: SortConfig = {
  allowedFields: {
    spdxId: 'l.id',
    name: 'l.name',
    category: 'l.category',
    osiApproved: 'l.osiApproved',
    status: 'l.allowed',
    componentCount: 'componentCount'
  },
  defaultOrderBy: 'componentCount DESC, l.id ASC'
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
    
    if (filters.allowed !== undefined) {
      conditions.push('l.allowed = $allowed')
      params.allowed = filters.allowed
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
    
    if (filters.allowed !== undefined) {
      conditions.push('l.allowed = $allowed')
      params.allowed = filters.allowed
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
        l.allowed as allowed,
        l.createdAt as createdAt,
        l.updatedAt as updatedAt,
        componentCount
      ORDER BY ${buildOrderByClause({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, licenseSortConfig)}
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
        l.allowed as allowed,
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
   * Update allowed status for a license
   * 
   * @param id - License ID
   * @param allowed - New allowed status
   * @returns True if license was updated
   */
  async updateAllowedStatus(id: string, allowed: boolean, userId?: string): Promise<boolean> {
    const cypher = `
      MATCH (l:License {id: $id})
      WITH l, l.allowed as previousAllowed
      SET l.allowed = $allowed,
          l.updatedAt = datetime()
      WITH l, previousAllowed
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: CASE $allowed WHEN true THEN 'ENABLE' ELSE 'DISABLE' END,
        entityType: 'License',
        entityId: l.id,
        entityLabel: l.name,
        previousStatus: CASE previousAllowed WHEN true THEN 'enabled' ELSE 'disabled' END,
        newStatus: CASE $allowed WHEN true THEN 'enabled' ELSE 'disabled' END,
        changedFields: ['allowed'],
        reason: null,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(l)
      RETURN count(l) as updated
    `
    
    const { records } = await this.executeQuery(cypher, { id, allowed, userId: userId || null })
    return records[0]?.get('updated').toNumber() > 0
  }

  /**
   * Get all allowed licenses
   * 
   * @returns Array of allowed licenses
   */
  async getAllowedLicenses(): Promise<License[]> {
    return this.findAll({ allowed: true })
  }

  /**
   * Check if a license is allowed
   * 
   * @param id - License ID
   * @returns True if license is allowed
   */
  async isAllowed(id: string): Promise<boolean> {
    const cypher = `
      MATCH (l:License {id: $id})
      RETURN l.allowed as allowed
    `
    
    const { records } = await this.executeQuery(cypher, { id })
    return records[0]?.get('allowed') || false
  }

  /**
   * Bulk update allowed status for multiple licenses atomically
   * 
   * Uses a transaction to ensure all licenses are updated or none are.
   * Validates that all licenses exist before updating.
   * 
   * @param licenseIds - Array of license IDs
   * @param allowed - New allowed status
   * @returns Number of licenses updated
   * @throws Error if any license does not exist
   */
  async bulkUpdateAllowedStatus(licenseIds: string[], allowed: boolean, userId?: string): Promise<number> {
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
      WITH license, license.allowed as previousAllowed
      SET license.allowed = $allowed,
          license.updatedAt = datetime()
      WITH license, previousAllowed
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: CASE $allowed WHEN true THEN 'ENABLE' ELSE 'DISABLE' END,
        entityType: 'License',
        entityId: license.id,
        entityLabel: license.name,
        previousStatus: CASE previousAllowed WHEN true THEN 'enabled' ELSE 'disabled' END,
        newStatus: CASE $allowed WHEN true THEN 'enabled' ELSE 'disabled' END,
        changedFields: ['allowed'],
        reason: null,
        source: 'API',
        userId: $userId
      })
      CREATE (a)-[:AUDITS]->(license)
      RETURN count(license) as updated
    `
    
    const { records } = await this.executeQueryWithSession(cypher, { licenseIds, allowed, userId: userId || null })
    
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
   * Find components that use a specific license, with pagination
   */
  async findComponentsByLicenseId(
    licenseId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: LicenseComponent[]; total: number }> {
    const cypher = `
      MATCH (c:Component)-[:HAS_LICENSE]->(l:License {id: $licenseId})
      WITH count(DISTINCT c) as total
      MATCH (c:Component)-[:HAS_LICENSE]->(l:License {id: $licenseId})
      OPTIONAL MATCH (s:System)-[:USES]->(c)
      OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(t:Technology)
      WITH c, total, count(DISTINCT s) as systemCount, t.name as technologyName
      ORDER BY c.packageManager ASC, c.name ASC, c.version ASC
      SKIP toInteger($offset) LIMIT toInteger($limit)
      RETURN c.name as name,
             c.version as version,
             c.packageManager as packageManager,
             c.type as type,
             c.purl as purl,
             systemCount,
             technologyName,
             total
    `

    const { records } = await this.executeQuery(cypher, {
      licenseId,
      limit,
      offset
    })

    const total = records.length > 0 ? records[0].get('total').toNumber() : 0

    return {
      data: records.map(record => ({
        name: record.get('name'),
        version: record.get('version'),
        packageManager: record.get('packageManager'),
        type: record.get('type'),
        purl: record.get('purl'),
        systemCount: record.get('systemCount').toNumber(),
        technologyName: record.get('technologyName')
      })),
      total
    }
  }

  /**
   * Find components using disallowed licenses
   */
  async findViolations(): Promise<LicenseViolation[]> {
    const query = await loadQuery('licenses/find-violations.cypher')
    const { records } = await this.executeQuery(query, {})
    return records.map(record => ({
      teamName: record.get('teamName'),
      systemName: record.get('systemName'),
      componentName: record.get('componentName'),
      componentVersion: record.get('componentVersion'),
      componentPurl: record.get('componentPurl'),
      licenseId: record.get('licenseId'),
      licenseName: record.get('licenseName'),
      licenseCategory: record.get('licenseCategory')
    }))
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
      allowed: record.get('allowed') || false,
      createdAt: record.get('createdAt')?.toString() || '',
      updatedAt: record.get('updatedAt')?.toString() || '',
      componentCount: record.get('componentCount')?.toNumber() || 0
    }
  }
}
