import { ViolationRepository } from '../repositories/violation.repository'
import { LicenseRepository } from '../repositories/license.repository'
import { ComplianceRepository } from '../repositories/compliance.repository'
import { VersionConstraintService } from './version-constraint.service'

export interface ReconciliationSummary {
  license: { touched: number; resolved: number }
  compliance: { touched: number; resolved: number }
  versionConstraint: { touched: number; resolved: number }
}

/**
 * Orchestrates the violation reconciliation sweep: fetches the current
 * computed violation set for each of the three types (reusing the exact
 * live find-violations logic each GET .../violations endpoint uses, always
 * with directOnly: true — see docs/architecture/decisions/0006 and the
 * Phase 7 plan for why compliance violations specifically need this pinned)
 * and reconciles it against tracked violation nodes.
 */
export class ViolationService {
  private violationRepo: ViolationRepository
  private licenseRepo: LicenseRepository
  private complianceRepo: ComplianceRepository
  private versionConstraintService: VersionConstraintService

  constructor() {
    this.violationRepo = new ViolationRepository()
    this.licenseRepo = new LicenseRepository()
    this.complianceRepo = new ComplianceRepository()
    this.versionConstraintService = new VersionConstraintService()
  }

  async reconcileAll(): Promise<ReconciliationSummary> {
    const runStartedAt = new Date().toISOString()

    const [license, compliance, versionConstraint] = await Promise.all([
      this.reconcileLicense(runStartedAt),
      this.reconcileCompliance(runStartedAt),
      this.reconcileVersionConstraint(runStartedAt)
    ])

    return { license, compliance, versionConstraint }
  }

  private async reconcileLicense(runStartedAt: string) {
    // includeWaived: true — the reconciler must track the true underlying
    // condition regardless of waivers. Waiving doesn't mean the violation
    // resolved; if reconciliation only saw the non-waived subset, a waived
    // violation's lastSeenAt would go stale and pass 2 would incorrectly
    // mark it 'resolved' even though nothing was actually fixed.
    const { data } = await this.licenseRepo.findViolations({ directOnly: true, includeWaived: true })
    const violations = data.map(v => ({
      systemName: v.systemName,
      componentPurl: v.componentPurl ?? `${v.componentName}@${v.componentVersion ?? 'unknown'}`,
      licenseId: v.licenseId
    }))
    return this.violationRepo.reconcileLicenseViolations(violations, runStartedAt)
  }

  private async reconcileCompliance(runStartedAt: string) {
    const data = await this.complianceRepo.findViolations({ directOnly: true, includeWaived: true })
    const violations = data.map(v => ({ teamName: v.team, technologyName: v.technology }))
    return this.violationRepo.reconcileComplianceViolations(violations, runStartedAt)
  }

  private async reconcileVersionConstraint(runStartedAt: string) {
    const { data } = await this.versionConstraintService.getViolations({ directOnly: true, includeWaived: true })
    const violations = data.map(v => ({
      systemName: v.system,
      componentPurl: v.componentPurl,
      constraintName: v.constraint.name
    }))
    return this.violationRepo.reconcileVersionConstraintViolations(violations, runStartedAt)
  }
}
