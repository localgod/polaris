import { LicenseRepository } from '../repositories/license.repository'
import type { License, LicenseFilters } from '../repositories/license.repository'

/**
 * Service for license-related business logic
 */
export class LicenseService {
  private licenseRepo: LicenseRepository

  constructor() {
    this.licenseRepo = new LicenseRepository()
  }

  /**
   * Get all licenses with optional filtering and pagination
   * 
   * Business rules:
   * - Default limit is 50 licenses per page
   * - Search is case-insensitive
   * - Returns total count for pagination
   * 
   * @param filters - Optional filters to apply
   * @returns Array of licenses with count and total
   */
  async findAll(filters: LicenseFilters = {}): Promise<{ 
    data: License[]
    count: number
    total: number 
  }> {
    // Set defaults
    const limit = filters.limit !== undefined ? filters.limit : 50
    const offset = filters.offset || 0
    
    // Apply filters with pagination
    const filtersWithPagination = {
      ...filters,
      limit,
      offset
    }
    
    // Get filtered licenses
    const licenses = await this.licenseRepo.findAll(filtersWithPagination)
    
    // Get total count (without pagination)
    const total = await this.licenseRepo.count(filters)
    return {
      data: licenses,
      count: licenses.length,
      total
    }
  }

  /**
   * Get a license by ID
   * 
   * @param id - License ID (SPDX identifier)
   * @returns License or null if not found
   */
  async findById(id: string): Promise<License | null> {
    return this.licenseRepo.findById(id)
  }

  /**
   * Get license statistics
   * 
   * @returns License statistics including whitelist counts
   */
  async getStatistics(): Promise<{
    total: number
    byCategory: Record<string, number>
    osiApproved: number
    deprecated: number
    whitelisted: number
  }> {
    const baseStats = await this.licenseRepo.getStatistics()
    const whitelistedLicenses = await this.licenseRepo.getWhitelistedLicenses()
    
    return {
      ...baseStats,
      whitelisted: whitelistedLicenses.length
    }
  }

  /**
   * Get all whitelisted licenses
   * 
   * Business rules:
   * - Only superadmins can manage whitelist
   * - Whitelisted licenses are globally approved for use
   * 
   * @returns Array of whitelisted licenses
   */
  async getWhitelistedLicenses(): Promise<License[]> {
    return this.licenseRepo.getWhitelistedLicenses()
  }

  /**
   * Update whitelist status for a license
   * 
   * Business rules:
   * - Only existing licenses can be whitelisted
   * - Whitelist changes affect global compliance
   * - Audit trail should be maintained
   * 
   * @param id - License ID
   * @param whitelisted - New whitelist status
   * @returns True if license was updated successfully
   */
  async updateWhitelistStatus(id: string, whitelisted: boolean): Promise<boolean> {
    // Verify license exists
    const license = await this.licenseRepo.findById(id)
    if (!license) {
      throw new Error(`License '${id}' not found`)
    }
    
    // Update whitelist status
    const updated = await this.licenseRepo.updateWhitelistStatus(id, whitelisted)
    
    if (!updated) {
      throw new Error(`Failed to update whitelist status for license '${id}'`)
    }
    
    return true
  }

  /**
   * Bulk update whitelist status for multiple licenses
   * 
   * Business rules:
   * - Only existing licenses can be whitelisted
   * - All or nothing approach - if any license fails, none are updated
   * - Returns summary of operation
   * 
   * @param licenseIds - Array of license IDs
   * @param whitelisted - New whitelist status
   * @returns Operation summary
   */
  async bulkUpdateWhitelistStatus(licenseIds: string[], whitelisted: boolean): Promise<{
    success: boolean
    updated: number
    errors: string[]
  }> {
    const errors: string[] = []
    
    // Validate all licenses exist
    for (const id of licenseIds) {
      const license = await this.licenseRepo.findById(id)
      if (!license) {
        errors.push(`License '${id}' not found`)
      }
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        updated: 0,
        errors
      }
    }
    
    // Perform bulk update
    const updated = await this.licenseRepo.bulkUpdateWhitelistStatus(licenseIds, whitelisted)
    
    return {
      success: updated === licenseIds.length,
      updated,
      errors: updated === licenseIds.length ? [] : ['Some licenses failed to update']
    }
  }

  /**
   * Check if a license is whitelisted
   * 
   * @param id - License ID
   * @returns True if license is whitelisted
   */
  async isWhitelisted(id: string): Promise<boolean> {
    return this.licenseRepo.isWhitelisted(id)
  }

  /**
   * Check if a license exists
   * 
   * @param id - License ID
   * @returns True if license exists
   */
  async exists(id: string): Promise<boolean> {
    return this.licenseRepo.exists(id)
  }
}