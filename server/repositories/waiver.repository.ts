import { BaseRepository } from './base.repository'
import { loadQuery } from '../utils/query-loader'

export type ViolationType = 'license' | 'compliance' | 'version-constraint'

export interface LicenseNaturalKey {
  systemName: string
  componentPurl: string
  licenseId: string
}

export interface ComplianceNaturalKey {
  teamName: string
  technologyName: string
}

export interface VersionConstraintNaturalKey {
  systemName: string
  componentPurl: string
  constraintName: string
}

export type NaturalKey = LicenseNaturalKey | ComplianceNaturalKey | VersionConstraintNaturalKey

export interface Waiver {
  id: string
  reason: string
  createdBy: string
  createdAt: string
  expiresAt: string
}

export interface WaiverForRevoke {
  id: string
  revokedAt: string | null
  violationType: string
  teamName: string | null
}

const CREATE_QUERY_BY_TYPE: Record<ViolationType, string> = {
  license: 'violations/create-license-waiver.cypher',
  compliance: 'violations/create-compliance-waiver.cypher',
  'version-constraint': 'violations/create-version-constraint-waiver.cypher'
}

export class WaiverRepository extends BaseRepository {
  /**
   * Resolve the owning team for a System — used to authorize a waiver
   * request for license/version-constraint violations, which are keyed by
   * System rather than carrying a team name directly.
   */
  async findOwningTeamForSystem(systemName: string): Promise<string | null> {
    const query = await loadQuery('violations/find-owning-team-for-system.cypher')
    const { records } = await this.executeQuery(query, { systemName })
    return records[0]?.get('teamName') ?? null
  }

  async create(
    violationType: ViolationType,
    naturalKey: NaturalKey,
    params: { reason: string; expiresAt: string; createdBy: string; realUserId?: string | null }
  ): Promise<Waiver> {
    const query = await loadQuery(CREATE_QUERY_BY_TYPE[violationType])
    const { records } = await this.executeQuery(query, {
      ...naturalKey,
      reason: params.reason,
      expiresAt: params.expiresAt,
      createdBy: params.createdBy
    })

    const record = records[0]!
    const waiver: Waiver = {
      id: record.get('id'),
      reason: record.get('reason'),
      createdBy: record.get('createdBy'),
      createdAt: record.get('createdAt')?.toString() || '',
      expiresAt: record.get('expiresAt')?.toString() || ''
    }

    await this.attachAuditLogBestEffort('violations/attach-waiver-audit-log.cypher', {
      waiverId: waiver.id,
      operation: 'CREATE',
      changedFields: ['reason', 'expiresAt'],
      reason: params.reason,
      userId: params.createdBy,
      realUserId: params.realUserId ?? null
    })

    return waiver
  }

  async findForRevoke(id: string): Promise<WaiverForRevoke | null> {
    const query = await loadQuery('violations/find-waiver-for-revoke.cypher')
    const { records } = await this.executeQuery(query, { id })
    if (records.length === 0) return null

    const record = records[0]!
    return {
      id: record.get('id'),
      revokedAt: record.get('revokedAt')?.toString() || null,
      violationType: record.get('violationType'),
      teamName: record.get('teamName')
    }
  }

  async revoke(id: string, revokedBy: string, realUserId?: string | null): Promise<boolean> {
    const query = await loadQuery('violations/revoke-waiver.cypher')
    const { records } = await this.executeQuery(query, { id, revokedBy })
    if (records.length === 0) return false

    await this.attachAuditLogBestEffort('violations/attach-waiver-audit-log.cypher', {
      waiverId: id,
      operation: 'REVOKE',
      changedFields: ['revokedAt'],
      reason: null,
      userId: revokedBy,
      realUserId: realUserId ?? null
    })

    return true
  }
}
