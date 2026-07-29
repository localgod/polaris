import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import { buildOrderByClause, type SortConfig } from '../utils/sorting'
import { loadQuery, loadQueryWithAudit, injectWhereConditions, injectOrderBy, injectPlaceholder } from '../utils/query-loader'

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
  systemBusinessCriticality: string | null
  systemEnvironment: string | null
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

export interface LicenseViolationFilters {
  search?: string
  /** Restrict to direct dependencies only (USES {isDirect: true}) */
  directOnly?: boolean
  /** Restrict to a specific dependency scope on the USES edge */
  depScope?: string
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const violationSortConfig: SortConfig = {
  allowedFields: {
    componentName: 'comp.name',
    componentVersion: 'comp.version',
    licenseId: 'license.id',
    systemName: 'sys.name',
    teamName: 'team.name'
  },
  defaultOrderBy: 'team.name ASC, sys.name ASC, comp.name ASC'
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
    const { conditions, params } = this.buildFilterConditions(filters)
    const query = injectWhereConditions(await loadQuery('licenses/count.cypher'), conditions)

    const { records } = await this.executeQuery(query, params)
    return records[0]?.get('total').toNumber() || 0
  }

  /**
   * Find all licenses with optional filtering
   * 
   * @param filters - Optional filters to apply
   * @returns Array of licenses
   */
  async findAll(filters: LicenseFilters = {}): Promise<License[]> {
    const { conditions, params } = this.buildFilterConditions(filters)

    if (filters.limit !== undefined) {
      params.offset = filters.offset || 0
      params.limit = filters.limit
    }

    let query = injectWhereConditions(await loadQuery('licenses/find-all.cypher'), conditions)
    query = injectOrderBy(query, buildOrderByClause({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, licenseSortConfig))
    query = injectPlaceholder(query, 'PAGINATION', filters.limit !== undefined ? 'SKIP toInteger($offset) LIMIT toInteger($limit)' : '')

    const { records } = await this.executeQuery(query, params)
    return records.map(record => this.mapToLicense(record))
  }

  /**
   * Find a license by ID
   * 
   * @param id - License ID (SPDX identifier)
   * @returns License or null if not found
   */
  async findById(id: string): Promise<License | null> {
    const query = await loadQuery('licenses/find-by-id.cypher')

    const { records } = await this.executeQuery(query, { id })
    
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
    const query = await loadQuery('licenses/exists.cypher')

    const { records } = await this.executeQuery(query, { id })
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
    const query = await loadQuery('licenses/get-statistics.cypher')

    const { records } = await this.executeQuery(query)
    
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
  async updateAllowedStatus(id: string, allowed: boolean, userId?: string, realUserId?: string | null): Promise<boolean> {
    const query = await loadQueryWithAudit('licenses/update-allowed-status.cypher')

    const { records } = await this.executeQuery(query, { id, allowed, userId: userId || null, realUserId: realUserId ?? null })
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
    const query = await loadQuery('licenses/is-allowed.cypher')

    const { records } = await this.executeQuery(query, { id })
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
  async bulkUpdateAllowedStatus(licenseIds: string[], allowed: boolean, userId?: string, realUserId?: string | null): Promise<number> {
    if (licenseIds.length === 0) return 0

    const query = await loadQueryWithAudit('licenses/bulk-update-allowed-status.cypher')

    const { records } = await this.executeQueryWithSession(query, { licenseIds, allowed, userId: userId || null, realUserId: realUserId ?? null })
    
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
    // Count query — always returns exactly one row
    const countQuery = await loadQuery('licenses/find-components-by-license-id-count.cypher')
    const { records: countRecords } = await this.executeQuery(countQuery, { licenseId })
    const total = countRecords[0]?.get('total')?.toNumber() ?? 0

    if (total === 0) {
      return { data: [], total: 0 }
    }

    // Data query — only runs when there are components to return
    const dataQuery = await loadQuery('licenses/find-components-by-license-id.cypher')

    const { records } = await this.executeQuery(dataQuery, { licenseId, limit, offset })

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
  async findViolations(filters: LicenseViolationFilters = {}): Promise<{ data: LicenseViolation[], total: number }> {
    const conditions: string[] = []
    const params: Record<string, unknown> = {
      directOnly: filters.directOnly ?? null,
      depScope: filters.depScope ?? null,
    }

    if (filters.search) {
      conditions.push('(toLower(comp.name) CONTAINS toLower($search) OR toLower(license.id) CONTAINS toLower($search) OR toLower(sys.name) CONTAINS toLower($search) OR toLower(team.name) CONTAINS toLower($search))')
      params.search = filters.search
    }

    // Count query
    const countQuery = injectWhereConditions(await loadQuery('licenses/find-violations-count.cypher'), conditions)
    const { records: countRecords } = await this.executeQuery(countQuery, params)
    const total = countRecords[0]?.get('total').toNumber() || 0

    // Data query
    if (filters.limit !== undefined) {
      params.offset = filters.offset || 0
      params.limit = filters.limit
    }

    let dataQuery = injectWhereConditions(await loadQuery('licenses/find-violations.cypher'), conditions)
    dataQuery = injectOrderBy(dataQuery, buildOrderByClause({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, violationSortConfig))
    dataQuery = injectPlaceholder(dataQuery, 'PAGINATION', filters.limit !== undefined ? 'SKIP toInteger($offset) LIMIT toInteger($limit)' : '')

    const { records } = await this.executeQuery(dataQuery, params)
    const data = records.map(record => ({
      teamName: record.get('teamName'),
      systemName: record.get('systemName'),
      systemBusinessCriticality: record.get('systemBusinessCriticality') || null,
      systemEnvironment: record.get('systemEnvironment') || null,
      componentName: record.get('componentName'),
      componentVersion: record.get('componentVersion'),
      componentPurl: record.get('componentPurl'),
      licenseId: record.get('licenseId'),
      licenseName: record.get('licenseName'),
      licenseCategory: record.get('licenseCategory')
    }))

    return { data, total }
  }

  /**
   * Build WHERE conditions + bound params shared by count() and findAll()
   */
  private buildFilterConditions(filters: LicenseFilters): { conditions: string[]; params: Record<string, unknown> } {
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

    return { conditions, params }
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
