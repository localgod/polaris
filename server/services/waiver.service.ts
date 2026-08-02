import { WaiverRepository, type ViolationType, type NaturalKey, type LicenseNaturalKey, type ComplianceNaturalKey, type VersionConstraintNaturalKey, type Waiver, type WaiverForRevoke } from '../repositories/waiver.repository'

export const VALID_VIOLATION_TYPES: ViolationType[] = ['license', 'compliance', 'version-constraint']

export interface CreateWaiverInput {
  violationType: ViolationType
  naturalKey: NaturalKey
  reason: string
  expiresAt: string
  createdBy: string
  realUserId?: string | null
}

/**
 * Business logic for the violation waiver/risk-acceptance workflow.
 * Expiry is mandatory (see Phase 7 plan) — a waiver with no forced
 * re-review is exactly the "bucket nothing forces you to empty" state
 * ADR-0005 already rejected once for the unreviewed-state question.
 */
export class WaiverService {
  private waiverRepo: WaiverRepository

  constructor() {
    this.waiverRepo = new WaiverRepository()
  }

  /**
   * Resolve the owning team for a natural key, for the API layer to run
   * requireTeamAccess() against before any write happens. Compliance
   * violations carry teamName directly; license/version-constraint
   * violations are keyed by System and need a graph lookup.
   */
  async resolveOwningTeam(violationType: ViolationType, naturalKey: NaturalKey): Promise<string | null> {
    if (violationType === 'compliance') {
      return (naturalKey as ComplianceNaturalKey).teamName
    }
    return this.waiverRepo.findOwningTeamForSystem((naturalKey as LicenseNaturalKey | VersionConstraintNaturalKey).systemName)
  }

  async create(input: CreateWaiverInput): Promise<Waiver> {
    this.validateNaturalKey(input.violationType, input.naturalKey)

    if (!input.reason?.trim()) {
      throw createError({ statusCode: 400, message: 'reason is required' })
    }

    if (!input.expiresAt) {
      throw createError({ statusCode: 400, message: 'expiresAt is required — waivers cannot be indefinite' })
    }
    const expiresAtDate = new Date(input.expiresAt)
    if (Number.isNaN(expiresAtDate.getTime()) || expiresAtDate.getTime() <= Date.now()) {
      throw createError({ statusCode: 400, message: 'expiresAt must be a valid date in the future' })
    }

    return this.waiverRepo.create(input.violationType, input.naturalKey, {
      reason: input.reason.trim(),
      expiresAt: input.expiresAt,
      createdBy: input.createdBy,
      realUserId: input.realUserId ?? null
    })
  }

  async findForRevoke(id: string): Promise<WaiverForRevoke | null> {
    return this.waiverRepo.findForRevoke(id)
  }

  async revoke(id: string, revokedBy: string, realUserId?: string | null): Promise<void> {
    const waiver = await this.waiverRepo.findForRevoke(id)
    if (!waiver) {
      throw createError({ statusCode: 404, message: `Waiver '${id}' not found` })
    }
    if (waiver.revokedAt) {
      throw createError({ statusCode: 409, message: `Waiver '${id}' is already revoked` })
    }

    await this.waiverRepo.revoke(id, revokedBy, realUserId)
  }

  private validateNaturalKey(violationType: ViolationType, naturalKey: NaturalKey): void {
    if (!VALID_VIOLATION_TYPES.includes(violationType)) {
      throw createError({ statusCode: 400, message: `Invalid violationType. Must be one of: ${VALID_VIOLATION_TYPES.join(', ')}` })
    }

    if (violationType === 'compliance') {
      const key = naturalKey as ComplianceNaturalKey
      if (!key.teamName || !key.technologyName) {
        throw createError({ statusCode: 400, message: 'naturalKey.teamName and naturalKey.technologyName are required for compliance violations' })
      }
      return
    }

    if (violationType === 'license') {
      const key = naturalKey as LicenseNaturalKey
      if (!key.systemName || !key.componentPurl || !key.licenseId) {
        throw createError({ statusCode: 400, message: 'naturalKey.systemName, naturalKey.componentPurl, and naturalKey.licenseId are required for license violations' })
      }
      return
    }

    const key = naturalKey as VersionConstraintNaturalKey
    if (!key.systemName || !key.componentPurl || !key.constraintName) {
      throw createError({ statusCode: 400, message: 'naturalKey.systemName, naturalKey.componentPurl, and naturalKey.constraintName are required for version-constraint violations' })
    }
  }
}
