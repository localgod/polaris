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
   * - Pre-validates all licenses exist before attempting update
   * - Provides specific error messages for missing licenses
   * - Uses atomic transaction for the actual update operation
   * - Returns detailed operation summary
   * 
   * @param licenseIds - Array of license IDs
   * @param whitelisted - New whitelist status
   * @returns Operation summary with success status, updated count, and any errors
   */
  async bulkUpdateWhitelistStatus(licenseIds: string[], whitelisted: boolean): Promise<{
    success: boolean
    updated: number
    errors: string[]
  }> {
    // Handle empty array case - early return without repository call
    if (licenseIds.length === 0) {
      return {
        success: true,
        updated: 0,
        errors: []
      }
    }

    try {
      // Pre-validate all licenses exist in parallel to provide specific error messages
      // Using Promise.allSettled to handle partial failures gracefully
      const validationResults = await Promise.allSettled(
        licenseIds.map(async (licenseId) => ({
          licenseId,
          license: await this.licenseRepo.findById(licenseId)
        }))
      )

      // Collect validation errors
      const errors: string[] = []
      for (let i = 0; i < validationResults.length; i++) {
        const result = validationResults[i]
        if (result.status === 'rejected') {
          // findById call failed (database error, etc.)
          const errorMsg = result.reason instanceof Error ? result.reason.message : 'Validation failed'
          errors.push(`License '${licenseIds[i]}': ${errorMsg}`)
        } else if (!result.value.license) {
          // License doesn't exist
          errors.push(`License '${result.value.licenseId}' not found`)
        }
      }

      // If any validation errors, return without attempting update
      if (errors.length > 0) {
        return {
          success: false,
          updated: 0,
          errors
        }
      }

      // All licenses exist, proceed with atomic bulk update
      const updated = await this.licenseRepo.bulkUpdateWhitelistStatus(licenseIds, whitelisted)
      
      // Check if all licenses were updated (should not happen with atomic transaction, but safety check)
      if (updated < licenseIds.length) {
        return {
          success: false,
          updated,
          errors: ['Some licenses failed to update (unexpected partial update)']
        }
      }
      
      return {
        success: true,
        updated,
        errors: []
      }
    } catch (error) {
      // Catch any errors from findById or bulkUpdateWhitelistStatus
      const errorMessage = error instanceof Error ? error.message : 'Bulk update failed'
      return {
        success: false,
        updated: 0,
        errors: [errorMessage]
      }
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