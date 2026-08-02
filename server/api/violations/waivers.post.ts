import { waiverService } from '../../services/singletons'
import { auditFailedOperation } from '../../utils/audit'
import type { ViolationType, NaturalKey } from '../../repositories/waiver.repository'

/**
 * @openapi
 * /violations/waivers:
 *   post:
 *     tags:
 *       - Violations
 *     summary: Waive a specific violation instance
 *     description: |
 *       Records that a team has seen and accepted a specific violation instance, so
 *       it stops surfacing in violation lists/counts until the waiver expires or is
 *       revoked. Expiry is mandatory — waivers cannot be indefinite. The caller must
 *       be a member of the violation's owning team (or a superuser).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [violationType, naturalKey, reason, expiresAt]
 *             properties:
 *               violationType:
 *                 type: string
 *                 enum: [license, compliance, version-constraint]
 *               naturalKey:
 *                 type: object
 *                 description: |
 *                   license/version-constraint: { systemName, componentPurl, licenseId | constraintName }.
 *                   compliance: { teamName, technologyName }.
 *               reason:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Waiver created
 *       400:
 *         description: Missing/invalid fields
 *       403:
 *         description: User is not a member of the violation's owning team
 *       404:
 *         description: Could not resolve an owning team for this violation
 */
interface CreateWaiverRequest {
  violationType: ViolationType
  naturalKey: NaturalKey
  reason: string
  expiresAt: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateWaiverRequest>(event)

  if (!body?.violationType || !body?.naturalKey || !body?.reason || !body?.expiresAt) {
    throw createError({ statusCode: 400, message: 'violationType, naturalKey, reason, and expiresAt are required' })
  }

  const teamName = await waiverService.resolveOwningTeam(body.violationType, body.naturalKey)
  if (!teamName) {
    throw createError({ statusCode: 404, message: 'Could not resolve an owning team for this violation' })
  }

  const user = await requireTeamAccess(event, teamName)
  const realUserId = await getImpersonatorId(event)

  try {
    const waiver = await waiverService.create({
      violationType: body.violationType,
      naturalKey: body.naturalKey,
      reason: body.reason,
      expiresAt: body.expiresAt,
      createdBy: user.id,
      realUserId
    })

    return { success: true, data: waiver }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'CREATE',
      entityType: 'Waiver',
      entityId: JSON.stringify(body.naturalKey),
      reason: error instanceof Error ? error.message : 'Failed to create waiver',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
