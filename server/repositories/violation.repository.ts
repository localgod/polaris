import { BaseRepository } from './base.repository'
import { loadQuery } from '../utils/query-loader'

export interface LicenseViolationKey {
  systemName: string
  componentPurl: string
  licenseId: string
}

export interface ComplianceViolationKey {
  teamName: string
  technologyName: string
}

export interface VersionConstraintViolationKey {
  systemName: string
  componentPurl: string
  constraintName: string
}

export interface ReconcileResult {
  touched: number
  resolved: number
}

export interface ActiveWaiver {
  naturalKey: string
  waiverId: string
  reason: string
  expiresAt: string
}

/**
 * Tracks the detection->resolution lifecycle of the three violation types
 * (license, compliance/TIME, version-constraint) via a scheduled
 * reconciliation sweep (see server/tasks/violations/reconcile.ts). This is a
 * parallel tracking layer, not the source of truth for "is this a violation
 * right now" — the live find-violations queries remain that source. Tracked
 * nodes exist so a Waiver has something stable to attach to, and so
 * firstDetectedAt/resolvedAt give exact (not sampled) history for future
 * trend/resolution-time reporting.
 */
export class ViolationRepository extends BaseRepository {
  async reconcileLicenseViolations(violations: LicenseViolationKey[], runStartedAt: string): Promise<ReconcileResult> {
    const query = await loadQuery('violations/reconcile-license-violations.cypher')
    const { records } = await this.executeQuery(query, { violations, runStartedAt })
    return {
      touched: records[0]?.get('touched')?.toNumber() ?? 0,
      resolved: records[0]?.get('resolvedCount')?.toNumber() ?? 0
    }
  }

  async reconcileComplianceViolations(violations: ComplianceViolationKey[], runStartedAt: string): Promise<ReconcileResult> {
    const query = await loadQuery('violations/reconcile-compliance-violations.cypher')
    const { records } = await this.executeQuery(query, { violations, runStartedAt })
    return {
      touched: records[0]?.get('touched')?.toNumber() ?? 0,
      resolved: records[0]?.get('resolvedCount')?.toNumber() ?? 0
    }
  }

  async reconcileVersionConstraintViolations(violations: VersionConstraintViolationKey[], runStartedAt: string): Promise<ReconcileResult> {
    const query = await loadQuery('violations/reconcile-version-constraint-violations.cypher')
    const { records } = await this.executeQuery(query, { violations, runStartedAt })
    return {
      touched: records[0]?.get('touched')?.toNumber() ?? 0,
      resolved: records[0]?.get('resolvedCount')?.toNumber() ?? 0
    }
  }

  /**
   * Version-constraint violations are only partly determined by Cypher (the
   * semver range check happens in JS), so the waiver exclusion for this type
   * can't be embedded directly in a single query the way license/compliance
   * violations' can — the caller filters/annotates its own already-computed
   * result set against this lookup instead.
   */
  async findActiveWaivedVersionConstraintKeys(naturalKeys: string[]): Promise<Map<string, ActiveWaiver>> {
    if (naturalKeys.length === 0) return new Map()

    const query = await loadQuery('violations/find-active-waived-version-constraint-keys.cypher')
    const { records } = await this.executeQuery(query, { naturalKeys })

    const result = new Map<string, ActiveWaiver>()
    for (const record of records) {
      result.set(record.get('naturalKey'), {
        naturalKey: record.get('naturalKey'),
        waiverId: record.get('waiverId'),
        reason: record.get('reason'),
        expiresAt: record.get('expiresAt')?.toString() || ''
      })
    }
    return result
  }
}
