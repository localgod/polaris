import { PolicyRepository } from '../repositories/policy.repository'
import type { Policy, ViolationFilters, PolicyFilters, PolicyViolation, LicenseViolation, CreatePolicyInput, UpdatePolicyStatusInput, UpdatePolicyResult } from '../repositories/policy.repository'

export interface ViolationResult {
  data: PolicyViolation[]
  count: number
  summary: {
    critical: number
    error: number
    warning: number
    info: number
  }
}

export interface LicenseViolationResult {
  data: LicenseViolation[]
  count: number
  summary: {
    critical: number
    error: number
    warning: number
    info: number
  }
}

/**
 * Service for policy-related business logic
 */
export class PolicyService {
  private policyRepo: PolicyRepository

  constructor() {
    this.policyRepo = new PolicyRepository()
  }

  /**
   * Get all policies with optional filters
   * 
   * @param filters - Optional filters for scope, status, and enforcedBy
   * @returns Array of policies with count
   */
  async findAll(filters: PolicyFilters = {}): Promise<{ data: Policy[]; count: number }> {
    const policies = await this.policyRepo.findAll(filters)
    
    return {
      data: policies,
      count: policies.length
    }
  }

  /**
   * Get policy violations with optional filters
   * Includes business logic for validation and summary calculation
   * 
   * @param filters - Optional filters for severity, team, and technology
   * @returns Violation result with data, count, and summary
   */
  async getViolations(filters: ViolationFilters): Promise<ViolationResult> {
    // Business logic: validate filters
    this.validateFilters(filters)
    
    // Fetch violations from repository
    const violations = await this.policyRepo.findViolations(filters)
    
    // Business logic: calculate summary
    const summary = this.calculateSummary(violations)
    
    return {
      data: violations,
      count: violations.length,
      summary
    }
  }

  /**
   * Get a policy by name
   * 
   * @param name - Policy name
   * @returns Policy or null if not found
   */
  async findByName(name: string): Promise<Policy | null> {
    return await this.policyRepo.findByName(name)
  }

  /**
   * Delete a policy
   * 
   * Business rules:
   * - Policy must exist before deletion
   * - All relationships are automatically removed (DETACH DELETE)
   * 
   * @param name - Policy name
   * @throws Error if policy not found
   */
  async delete(name: string): Promise<void> {
    // Business logic: check if policy exists
    const exists = await this.policyRepo.exists(name)
    
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Policy '${name}' not found`
      })
    }
    
    // Delete the policy
    await this.policyRepo.delete(name)
  }

  /**
   * Create a new policy
   * 
   * Business rules:
   * - Policy name must be unique
   * - License-compliance policies must have licenseMode set
   * - Denylist mode requires deniedLicenses array
   * - Allowlist mode requires allowedLicenses array
   * - Organization-scope policies auto-create SUBJECT_TO relationships
   * 
   * @param input - Policy creation input
   * @returns Created policy
   * @throws Error if validation fails or policy already exists
   */
  async create(input: CreatePolicyInput): Promise<{ policy: Policy; relationshipsCreated: number }> {
    // Business logic: check if policy already exists
    const exists = await this.policyRepo.exists(input.name)
    if (exists) {
      throw createError({
        statusCode: 409,
        message: `Policy '${input.name}' already exists`
      })
    }
    
    // Business logic: validate license-compliance policies
    if (input.ruleType === 'license-compliance') {
      if (!input.licenseMode) {
        throw createError({
          statusCode: 400,
          message: 'License-compliance policies require licenseMode (allowlist or denylist)'
        })
      }
      
      if (input.licenseMode === 'denylist' && (!input.deniedLicenses || input.deniedLicenses.length === 0)) {
        throw createError({
          statusCode: 400,
          message: 'Denylist mode requires at least one license in deniedLicenses'
        })
      }
      
      if (input.licenseMode === 'allowlist' && (!input.allowedLicenses || input.allowedLicenses.length === 0)) {
        throw createError({
          statusCode: 400,
          message: 'Allowlist mode requires at least one license in allowedLicenses'
        })
      }
    }
    
    // Business logic: validate severity
    const validSeverities = ['critical', 'error', 'warning', 'info']
    if (!validSeverities.includes(input.severity)) {
      throw createError({
        statusCode: 400,
        message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      })
    }
    
    // Business logic: validate ruleType
    const validRuleTypes = ['approval', 'compliance', 'security', 'license-compliance']
    if (!validRuleTypes.includes(input.ruleType)) {
      throw createError({
        statusCode: 400,
        message: `Invalid ruleType. Must be one of: ${validRuleTypes.join(', ')}`
      })
    }
    
    // Create the policy
    return await this.policyRepo.create(input)
  }

  /**
   * Update a policy's status
   * 
   * Business rules:
   * - Policy must exist
   * - Status must be valid (active, draft, archived)
   * - Reason is recommended when disabling a policy
   * 
   * @param name - Policy name
   * @param input - Status update input
   * @returns Updated policy and previous status
   */
  async updateStatus(name: string, input: UpdatePolicyStatusInput): Promise<UpdatePolicyResult> {
    // Validate status
    if (input.status) {
      const validStatuses = ['active', 'draft', 'archived']
      if (!validStatuses.includes(input.status)) {
        throw createError({
          statusCode: 400,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        })
      }
    }
    
    // Update the policy
    return await this.policyRepo.updateStatus(name, input)
  }

  /**
   * Get license compliance violations with optional filters
   * Includes business logic for validation and summary calculation
   * 
   * @param filters - Optional filters for severity, team, system, and license
   * @returns License violation result with data, count, and summary
   */
  async getLicenseViolations(filters: ViolationFilters): Promise<LicenseViolationResult> {
    // Business logic: validate filters
    this.validateFilters(filters)
    
    // Fetch license violations from repository (without pagination to get total count)
    const { limit, offset, ...repoFilters } = filters
    const allViolations = await this.policyRepo.findLicenseViolations(repoFilters)
    
    // Business logic: calculate summary from all violations
    const summary = this.calculateLicenseSummary(allViolations)
    
    // Apply pagination if specified
    let paginatedViolations = allViolations
    if (limit !== undefined && offset !== undefined) {
      paginatedViolations = allViolations.slice(offset, offset + limit)
    } else if (limit !== undefined) {
      paginatedViolations = allViolations.slice(0, limit)
    }
    
    return {
      data: paginatedViolations,
      count: allViolations.length,
      summary
    }
  }

  /**
   * Validate filter inputs
   */
  private validateFilters(filters: ViolationFilters): void {
    const validSeverities = ['critical', 'error', 'warning', 'info']
    
    if (filters.severity && !validSeverities.includes(filters.severity)) {
      throw createError({
        statusCode: 400,
        message: `Invalid severity level. Must be one of: ${validSeverities.join(', ')}`
      })
    }
  }

  /**
   * Calculate violation summary by severity
   */
  private calculateSummary(violations: PolicyViolation[]) {
    return {
      critical: violations.filter(v => v.policy.severity === 'critical').length,
      error: violations.filter(v => v.policy.severity === 'error').length,
      warning: violations.filter(v => v.policy.severity === 'warning').length,
      info: violations.filter(v => v.policy.severity === 'info').length
    }
  }

  /**
   * Calculate license violation summary by severity
   */
  private calculateLicenseSummary(violations: LicenseViolation[]) {
    return {
      critical: violations.filter(v => v.policy.severity === 'critical').length,
      error: violations.filter(v => v.policy.severity === 'error').length,
      warning: violations.filter(v => v.policy.severity === 'warning').length,
      info: violations.filter(v => v.policy.severity === 'info').length
    }
  }
}
