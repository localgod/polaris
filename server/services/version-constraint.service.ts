import { VersionConstraintRepository } from '../repositories/version-constraint.repository'
import type {
  VersionConstraint, ViolationFilters, VersionConstraintFilters, Violation,
  CreateVersionConstraintInput, UpdateVersionConstraintInput, UpdateStatusInput, UpdateStatusResult
} from '../repositories/version-constraint.repository'
import semver from 'semver'

export interface ViolationResult {
  data: Violation[]
  count: number
  summary: {
    critical: number
    error: number
    warning: number
    info: number
  }
}

export class VersionConstraintService {
  private repo: VersionConstraintRepository

  constructor() {
    this.repo = new VersionConstraintRepository()
  }

  async findAll(filters: VersionConstraintFilters = {}): Promise<{ data: VersionConstraint[]; count: number }> {
    const constraints = await this.repo.findAll(filters)
    return { data: constraints, count: constraints.length }
  }

  async getViolations(filters: ViolationFilters): Promise<ViolationResult> {
    this.validateFilters(filters)

    const rawViolations = await this.repo.findViolations(filters)

    // Apply semver filtering — keep only components outside the allowed range
    const violations = rawViolations.filter(v => {
      if (!v.constraint.versionRange || !v.componentVersion) return false
      const coerced = semver.coerce(v.componentVersion)
      if (!coerced) return false
      return !semver.satisfies(coerced, v.constraint.versionRange)
    })

    return {
      data: violations,
      count: violations.length,
      summary: this.calculateSummary(violations)
    }
  }

  async findByName(name: string): Promise<VersionConstraint | null> {
    return await this.repo.findByName(name)
  }

  async delete(name: string, userId: string): Promise<void> {
    const exists = await this.repo.exists(name)
    if (!exists) {
      throw createError({ statusCode: 404, message: `Version constraint '${name}' not found` })
    }
    await this.repo.delete(name, userId)
  }

  async create(input: CreateVersionConstraintInput): Promise<{ constraint: VersionConstraint; relationshipsCreated: number }> {
    const exists = await this.repo.exists(input.name)
    if (exists) {
      throw createError({ statusCode: 409, message: `Version constraint '${input.name}' already exists` })
    }

    const validSeverities = ['critical', 'error', 'warning', 'info']
    if (!validSeverities.includes(input.severity)) {
      throw createError({ statusCode: 400, message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` })
    }

    if (input.scope === 'team' && !input.subjectTeam) {
      throw createError({ statusCode: 400, message: 'Team-scoped constraints require a subjectTeam' })
    }

    if (!input.versionRange) {
      throw createError({ statusCode: 400, message: 'versionRange is required (e.g., ">=18.0.0 <20.0.0")' })
    }

    return await this.repo.create(input)
  }

  async update(name: string, input: UpdateVersionConstraintInput): Promise<VersionConstraint> {
    const exists = await this.repo.exists(name)
    if (!exists) {
      throw createError({ statusCode: 404, message: `Version constraint '${name}' not found` })
    }

    if (input.severity) {
      const validSeverities = ['critical', 'error', 'warning', 'info']
      if (!validSeverities.includes(input.severity)) {
        throw createError({ statusCode: 400, message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` })
      }
    }

    if (input.scope === 'team' && !input.subjectTeam) {
      throw createError({ statusCode: 400, message: 'Team-scoped constraints require a subjectTeam' })
    }

    return await this.repo.update(name, input)
  }

  async updateStatus(name: string, input: UpdateStatusInput, userId: string): Promise<UpdateStatusResult> {
    if (input.status) {
      const validStatuses = ['active', 'draft', 'archived']
      if (!validStatuses.includes(input.status)) {
        throw createError({ statusCode: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
      }
    }
    return await this.repo.updateStatus(name, input, userId)
  }

  private validateFilters(filters: ViolationFilters): void {
    const validSeverities = ['critical', 'error', 'warning', 'info']
    if (filters.severity && !validSeverities.includes(filters.severity)) {
      throw createError({ statusCode: 400, message: `Invalid severity level. Must be one of: ${validSeverities.join(', ')}` })
    }
  }

  private calculateSummary(violations: Violation[]) {
    return {
      critical: violations.filter(v => v.constraint.severity === 'critical').length,
      error: violations.filter(v => v.constraint.severity === 'error').length,
      warning: violations.filter(v => v.constraint.severity === 'warning').length,
      info: violations.filter(v => v.constraint.severity === 'info').length
    }
  }
}
