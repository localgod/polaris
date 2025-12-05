import { PolicyRepository } from '../repositories/policy.repository'
import type { Policy, ViolationFilters, PolicyFilters, PolicyViolation, LicenseViolation } from '../repositories/policy.repository'

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
   * Get license compliance violations with optional filters
   * Includes business logic for validation and summary calculation
   * 
   * @param filters - Optional filters for severity, team, system, and license
   * @returns License violation result with data, count, and summary
   */
  async getLicenseViolations(filters: ViolationFilters): Promise<LicenseViolationResult> {
    // Business logic: validate filters
    this.validateFilters(filters)
    
    // Fetch license violations from repository
    const violations = await this.policyRepo.findLicenseViolations(filters)
    
    // Business logic: calculate summary
    const summary = this.calculateLicenseSummary(violations)
    
    return {
      data: violations,
      count: violations.length,
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
