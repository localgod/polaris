import type {
  Component,
  EOLStatus,
  KnownVulnerability,
  MaintenanceHealth,
  PackageMetadata,
  SecurityScorecard,
  VulnerabilityReport
} from '~~/types/api'
import { AuditLogRepository } from '../repositories/audit-log.repository'
import { ComponentRepository } from '../repositories/component.repository'
import {
  HealthRefreshRepository,
  type AdvisorySnapshot,
  type HealthRefreshJobItem
} from '../repositories/health-refresh.repository'
import { calculateMaintenanceHealth } from '../utils/component-health'
import { EOLService } from './eol.service'
import { PackageMetadataService } from './package-metadata.service'
import { SecurityScoreService } from './security-score.service'
import { VulnerabilityService } from './vulnerability.service'

type HealthSource = 'endoflife.date' | 'OSV.dev' | 'package-metadata' | 'OpenSSF Scorecard'

interface SourceFailure {
  source: HealthSource
  failedFields: string[]
  reason: string
}

interface RefreshResult {
  values: Record<string, unknown>
  advisories?: AdvisorySnapshot[]
  failures: SourceFailure[]
}

const EOL_FIELDS = ['eolStatus', 'eolDate', 'eolSource', 'eolRefreshedAt']
const VULNERABILITY_FIELDS = [
  'vulnerabilityTotal',
  'vulnerabilityCritical',
  'vulnerabilityHigh',
  'vulnerabilityMedium',
  'vulnerabilityLow',
  'vulnerabilitySource',
  'vulnerabilityRefreshedAt',
  'advisories'
]
const MAINTENANCE_FIELDS = [
  'maintenanceStatus',
  'maintenanceConfidence',
  'updateType',
  'ageInDays',
  'isDeprecated',
  'advisoryCount',
  'maintenanceSource',
  'maintenanceRefreshedAt'
]
const SECURITY_SCORE_FIELDS = ['securityScore', 'securityScoreSource', 'securityScoreRefreshedAt']

export class HealthRefreshService {
  constructor(
    private readonly healthRepo = new HealthRefreshRepository(),
    private readonly componentRepo = new ComponentRepository(),
    private readonly auditRepo = new AuditLogRepository(),
    private readonly eolService = new EOLService(),
    private readonly packageMetadataService = new PackageMetadataService(),
    private readonly securityScoreService = new SecurityScoreService(),
    private readonly vulnerabilityService = new VulnerabilityService()
  ) {}

  async enqueueForSystem(systemName: string): Promise<string> {
    return await this.healthRepo.enqueueForSystem(systemName)
  }

  async enqueueScheduledRefresh(): Promise<string> {
    return await this.healthRepo.enqueueAll('scheduled')
  }

  async processNextQueuedJob(options: { batchSize?: number } = {}): Promise<string | null> {
    const jobId = await this.healthRepo.claimNextQueuedJob()
    if (!jobId) return null

    try {
      await this.processJob(jobId, options)
      return jobId
    } catch (error) {
      await this.healthRepo.markJobFailed(jobId, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  async processJob(jobId: string, options: { batchSize?: number } = {}): Promise<void> {
    const batchSize = options.batchSize ?? 25

    while (true) {
      const items = await this.healthRepo.getPendingItems(jobId, batchSize)
      if (items.length === 0) break

      for (const item of items) {
        try {
          await this.processItem(jobId, item)
        } catch (error) {
          await this.healthRepo.markItemFinished(jobId, item.id, 'failed', {
            errorSummary: error instanceof Error ? error.message : String(error)
          })
        }
      }
    }

    await this.healthRepo.markJobCompletedIfDone(jobId)
  }

  private async processItem(jobId: string, item: HealthRefreshJobItem): Promise<void> {
    await this.healthRepo.markItemRunning(jobId, item.id)

    const component = await this.componentRepo.findByIdentity({
      purl: item.componentPurl,
      name: null,
      version: null,
      packageManager: null,
      group: null
    })

    if (!component) {
      await this.healthRepo.markItemFinished(jobId, item.id, 'skipped', {
        errorSummary: 'Component no longer exists'
      })
      return
    }

    const result = await this.refreshComponent(component)
    await this.healthRepo.upsertHealthSnapshot({
      componentPurl: component.purl!,
      componentName: component.name,
      values: result.values,
      advisories: result.advisories
    })

    if (result.failures.length > 0) {
      await this.auditRefreshFailures(jobId, component, result.failures)
    }

    await this.healthRepo.markItemFinished(
      jobId,
      item.id,
      result.failures.length > 0 ? 'failed' : 'refreshed',
      {
        failedSources: result.failures.map(failure => failure.source),
        failedFields: [...new Set(result.failures.flatMap(failure => failure.failedFields))],
        errorSummary: result.failures.map(failure => `${failure.source}: ${failure.reason}`).join('; ') || null
      }
    )
  }

  private async refreshComponent(component: Component): Promise<RefreshResult> {
    const now = new Date()
    const values: Record<string, unknown> = {}
    const failures: SourceFailure[] = []

    const [eolResult, packageMetadataResult, securityScorecardResult, vulnerabilitiesResult] = await Promise.allSettled([
      this.eolService.getEOLStatus(component),
      this.packageMetadataService.getMetadata(component),
      this.securityScoreService.getScore(component),
      this.vulnerabilityService.getVulnerabilities(component)
    ])

    if (eolResult.status === 'rejected') {
      failures.push({ source: 'endoflife.date', failedFields: EOL_FIELDS, reason: this.errorReason(eolResult.reason) })
    } else if (this.isFetchFailedEOL(eolResult.value)) {
      failures.push({ source: 'endoflife.date', failedFields: EOL_FIELDS, reason: eolResult.value.reason || 'fetch_failed' })
    } else {
      Object.assign(values, this.eolValues(eolResult.value, now))
    }

    if (packageMetadataResult.status === 'rejected') {
      failures.push({
        source: 'package-metadata',
        failedFields: MAINTENANCE_FIELDS,
        reason: this.errorReason(packageMetadataResult.reason)
      })
    } else if (this.isFetchFailedPackageMetadata(packageMetadataResult.value)) {
      failures.push({
        source: 'package-metadata',
        failedFields: MAINTENANCE_FIELDS,
        reason: packageMetadataResult.value.reason || 'fetch_failed'
      })
    } else {
      const maintenanceHealth = calculateMaintenanceHealth(component, packageMetadataResult.value, now)
      Object.assign(values, this.maintenanceValues(maintenanceHealth, packageMetadataResult.value, now))
    }

    let advisories: AdvisorySnapshot[] | undefined
    if (vulnerabilitiesResult.status === 'rejected') {
      failures.push({
        source: 'OSV.dev',
        failedFields: VULNERABILITY_FIELDS,
        reason: this.errorReason(vulnerabilitiesResult.reason)
      })
    } else if (this.isFetchFailedVulnerabilityReport(vulnerabilitiesResult.value)) {
      failures.push({
        source: 'OSV.dev',
        failedFields: VULNERABILITY_FIELDS,
        reason: vulnerabilitiesResult.value.reason || 'fetch_failed'
      })
    } else {
      Object.assign(values, this.vulnerabilityValues(vulnerabilitiesResult.value, now))
      advisories = vulnerabilitiesResult.value.vulnerabilities.map(vulnerability => this.advisorySnapshot(vulnerability))
    }

    if (securityScorecardResult.status === 'rejected') {
      failures.push({
        source: 'OpenSSF Scorecard',
        failedFields: SECURITY_SCORE_FIELDS,
        reason: this.errorReason(securityScorecardResult.reason)
      })
    } else if (this.isFetchFailedSecurityScore(securityScorecardResult.value)) {
      failures.push({
        source: 'OpenSSF Scorecard',
        failedFields: SECURITY_SCORE_FIELDS,
        reason: securityScorecardResult.value.reason || 'fetch_failed'
      })
    } else {
      Object.assign(values, this.securityScoreValues(securityScorecardResult.value, now))
    }

    return { values, advisories, failures }
  }

  private eolValues(eol: EOLStatus, now: Date): Record<string, unknown> {
    return {
      eolStatus: eol.status,
      eolDate: eol.eolDate,
      eolSource: eol.source.name,
      eolRefreshedAt: now.toISOString()
    }
  }

  private maintenanceValues(
    maintenanceHealth: MaintenanceHealth,
    packageMetadata: PackageMetadata,
    now: Date
  ): Record<string, unknown> {
    return {
      maintenanceStatus: maintenanceHealth.status,
      maintenanceConfidence: maintenanceHealth.confidence,
      updateType: maintenanceHealth.updateType,
      ageInDays: maintenanceHealth.ageInDays,
      isDeprecated: packageMetadata.status === 'available' ? packageMetadata.isDeprecated === true : false,
      advisoryCount: packageMetadata.status === 'available' ? packageMetadata.advisoryCount : null,
      maintenanceSource: packageMetadata.source.name,
      maintenanceRefreshedAt: now.toISOString()
    }
  }

  private vulnerabilityValues(report: VulnerabilityReport, now: Date): Record<string, unknown> {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const vulnerability of report.vulnerabilities) {
      counts[this.severityBucket(vulnerability)] += 1
    }

    return {
      vulnerabilityTotal: report.vulnerabilities.length,
      vulnerabilityCritical: counts.critical,
      vulnerabilityHigh: counts.high,
      vulnerabilityMedium: counts.medium,
      vulnerabilityLow: counts.low,
      vulnerabilitySource: report.source.name,
      vulnerabilityRefreshedAt: now.toISOString()
    }
  }

  private securityScoreValues(scorecard: SecurityScorecard, now: Date): Record<string, unknown> {
    return {
      securityScore: scorecard.score,
      securityScoreSource: scorecard.source.name,
      securityScoreRefreshedAt: now.toISOString()
    }
  }

  private advisorySnapshot(vulnerability: KnownVulnerability): AdvisorySnapshot {
    return {
      id: vulnerability.id,
      aliases: vulnerability.aliases,
      summary: vulnerability.summary,
      cvssVector: vulnerability.severity?.score || null,
      cvssScore: vulnerability.severity?.cvssScore ?? null,
      advisoryUrl: vulnerability.advisoryUrl,
      publishedAt: vulnerability.publishedAt,
      modifiedAt: vulnerability.modifiedAt,
      source: 'OSV.dev'
    }
  }

  private severityBucket(vulnerability: KnownVulnerability): 'critical' | 'high' | 'medium' | 'low' {
    const score = vulnerability.severity?.cvssScore
    if (typeof score === 'number') {
      if (score >= 9) return 'critical'
      if (score >= 7) return 'high'
      if (score >= 4) return 'medium'
      return 'low'
    }

    const label = `${vulnerability.severity?.type || ''} ${vulnerability.severity?.score || ''}`.toLowerCase()
    if (label.includes('critical')) return 'critical'
    if (label.includes('high')) return 'high'
    if (label.includes('medium') || label.includes('moderate')) return 'medium'
    return 'low'
  }

  private isFetchFailedEOL(eol: EOLStatus): boolean {
    return eol.status === 'unknown' && eol.reason === 'fetch_failed'
  }

  private isFetchFailedPackageMetadata(metadata: PackageMetadata): boolean {
    return metadata.status === 'unavailable' && metadata.reason === 'fetch_failed'
  }

  private isFetchFailedVulnerabilityReport(report: VulnerabilityReport): boolean {
    return report.status === 'unavailable' && report.reason === 'fetch_failed'
  }

  private isFetchFailedSecurityScore(scorecard: SecurityScorecard): boolean {
    return scorecard.status === 'unavailable' && scorecard.reason === 'fetch_failed'
  }

  private errorReason(error: unknown): string {
    return error instanceof Error ? error.message : 'fetch_failed'
  }

  private async auditRefreshFailures(
    jobId: string,
    component: Component,
    failures: SourceFailure[]
  ): Promise<void> {
    const failedFields = [...new Set(failures.flatMap(failure => failure.failedFields))]

    await this.auditRepo.create({
      operation: 'HEALTH_REFRESH_FAILED',
      entityType: 'Component',
      entityId: component.purl || `${component.packageManager || 'unknown'}:${component.group || ''}:${component.name}@${component.version}`,
      entityLabel: `${component.name}@${component.version}`,
      changedFields: failedFields,
      reason: failures.map(failure => `${failure.source}: ${failure.reason}`).join('; '),
      changes: {
        failures: {
          before: null,
          after: failures.map(failure => ({
            source: failure.source,
            failedFields: failure.failedFields,
            reason: failure.reason,
            healthRefreshJobId: jobId,
            componentPurl: component.purl
          }))
        }
      },
      source: 'HEALTH_REFRESH',
      userId: 'system'
    })
  }
}
