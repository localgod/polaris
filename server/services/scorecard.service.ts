import { SystemRepository } from '../repositories/system.repository'
import { TeamRepository } from '../repositories/team.repository'
import { VersionConstraintService } from './version-constraint.service'
import type { Scorecard, ScorecardCheck } from '~~/types/api'

const SBOM_FRESHNESS_DAYS = 30

/**
 * Service computing on-demand governance scorecards for Systems and Teams
 * from existing compliance data (no persistence — recomputed per request).
 */
export class ScorecardService {
  private systemRepo: SystemRepository
  private teamRepo: TeamRepository
  private versionConstraintService: VersionConstraintService

  constructor() {
    this.systemRepo = new SystemRepository()
    this.teamRepo = new TeamRepository()
    this.versionConstraintService = new VersionConstraintService()
  }

  /**
   * Compute the scorecard for a system.
   *
   * @param name - System name
   * @returns Scorecard, or null if the system does not exist
   */
  async getSystemScorecard(name: string): Promise<Scorecard | null> {
    const system = await this.systemRepo.findByName(name)
    if (!system) return null

    const [raw, criticalViolations] = await Promise.all([
      this.systemRepo.getScorecardRaw(name),
      this.versionConstraintService.getViolations({ system: name, severity: 'critical' })
    ])

    const checks: ScorecardCheck[] = [
      this.sbomFreshnessCheck(raw.lastSbomScanAt),
      this.eliminateViolationsCheck(raw.eliminateCount, raw.usedTechnologyCount),
      this.licenseViolationsCheck(raw.licenseViolationCount),
      this.criticalConstraintCheck(criticalViolations.summary.critical),
      this.classificationCoverageCheck(raw.unclassifiedCount, raw.usedTechnologyCount)
    ]

    return this.buildScorecard(checks)
  }

  /**
   * Compute the scorecard for a team.
   *
   * @param name - Team name
   * @returns Scorecard, or null if the team does not exist
   */
  async getTeamScorecard(name: string): Promise<Scorecard | null> {
    const team = await this.teamRepo.findByName(name)
    if (!team) return null

    const [raw, usage, criticalViolations] = await Promise.all([
      this.teamRepo.getScorecardRaw(name),
      this.teamRepo.findUsage(name),
      this.versionConstraintService.getViolations({ team: name, severity: 'critical' })
    ])

    // usage.summary.unapproved only counts technologies with no APPROVES relationship
    // at all — it misses complianceStatus 'unknown' (an APPROVES relationship exists
    // but its `time` isn't one of the recognized TIME values). Coverage means "has a
    // recognized TIME classification", so both cases count as unclassified.
    const unclassifiedCount = usage.usage.filter(
      u => u.complianceStatus === 'unapproved' || u.complianceStatus === 'unknown'
    ).length

    const checks: ScorecardCheck[] = [
      this.teamSbomFreshnessCheck(raw.systemScans),
      this.eliminateViolationsCheck(usage.summary.violations, usage.summary.totalTechnologies),
      this.licenseViolationsCheck(raw.licenseViolationCount),
      this.criticalConstraintCheck(criticalViolations.summary.critical),
      this.classificationCoverageCheck(unclassifiedCount, usage.summary.totalTechnologies)
    ]

    return this.buildScorecard(checks)
  }

  private buildScorecard(checks: ScorecardCheck[]): Scorecard {
    return {
      score: checks.filter(check => check.passed).length,
      maxScore: checks.length,
      checks
    }
  }

  private sbomFreshnessCheck(lastSbomScanAt: string | null): ScorecardCheck {
    const passed = this.isFresh(lastSbomScanAt)
    return {
      id: 'sbom-freshness',
      label: 'SBOM freshness',
      passed,
      detail: lastSbomScanAt
        ? `Last SBOM scan was ${this.daysSince(lastSbomScanAt)} day(s) ago`
        : 'No SBOM scan has been recorded'
    }
  }

  private teamSbomFreshnessCheck(systemScans: Array<{ system: string; lastSbomScanAt: string | null }>): ScorecardCheck {
    if (systemScans.length === 0) {
      return {
        id: 'sbom-freshness',
        label: 'SBOM freshness',
        passed: true,
        detail: 'Team owns no systems'
      }
    }

    const stale = systemScans.filter(scan => !this.isFresh(scan.lastSbomScanAt))
    return {
      id: 'sbom-freshness',
      label: 'SBOM freshness',
      passed: stale.length === 0,
      detail: stale.length === 0
        ? `All ${systemScans.length} owned system(s) have a fresh SBOM scan`
        : `${stale.length} of ${systemScans.length} owned system(s) have a stale or missing SBOM scan`
    }
  }

  private eliminateViolationsCheck(violationCount: number, usedTechnologyCount: number): ScorecardCheck {
    return {
      id: 'no-eliminate-violations',
      label: 'Eliminate violations',
      passed: violationCount === 0,
      detail: violationCount === 0
        ? 'No technologies marked for elimination are in use'
        : `${violationCount} of ${usedTechnologyCount} used technologies are marked for elimination`
    }
  }

  private licenseViolationsCheck(licenseViolationCount: number): ScorecardCheck {
    return {
      id: 'no-license-violations',
      label: 'License violations',
      passed: licenseViolationCount === 0,
      detail: licenseViolationCount === 0
        ? 'No components use a disallowed license'
        : `${licenseViolationCount} component(s) use a disallowed license`
    }
  }

  private criticalConstraintCheck(criticalViolationCount: number): ScorecardCheck {
    return {
      id: 'no-critical-version-violations',
      label: 'Critical version constraint violations',
      passed: criticalViolationCount === 0,
      detail: criticalViolationCount === 0
        ? 'No critical version constraint violations'
        : `${criticalViolationCount} critical version constraint violation(s)`
    }
  }

  private classificationCoverageCheck(unclassifiedCount: number, usedTechnologyCount: number): ScorecardCheck {
    return {
      id: 'time-classification-coverage',
      label: 'TIME classification coverage',
      passed: unclassifiedCount === 0,
      detail: unclassifiedCount === 0
        ? `All ${usedTechnologyCount} used technologies have a TIME classification`
        : `${unclassifiedCount} of ${usedTechnologyCount} used technologies have no TIME classification`
    }
  }

  private isFresh(lastSbomScanAt: string | null): boolean {
    if (!lastSbomScanAt) return false
    return this.daysSince(lastSbomScanAt) < SBOM_FRESHNESS_DAYS
  }

  private daysSince(iso: string): number {
    return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  }
}
