import { waiverService } from '../../../services/singletons'
import { auditFailedOperation } from '../../../utils/audit'

/**
 * @openapi
 * /violations/waivers/{id}:
 *   delete:
 *     tags:
 *       - Violations
 *     summary: Revoke a waiver
 *     description: |
 *       Revokes a waiver (sets revokedAt/revokedBy) so the violation it covered
 *       reappears in violation lists/counts on the next read. Never hard-deletes,
 *       matching the audit-preserving posture used elsewhere in Polaris.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Waiver revoked
 *       403:
 *         description: User is not a member of the violation's owning team
 *       404:
 *         description: Waiver not found
 *       409:
 *         description: Waiver is already revoked
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Waiver id is required' })
  }

  const waiver = await waiverService.findForRevoke(id)
  if (!waiver) {
    throw createError({ statusCode: 404, message: `Waiver '${id}' not found` })
  }

  const user = await requireTeamAccess(event, waiver.teamName ?? '')
  const realUserId = await getImpersonatorId(event)

  try {
    await waiverService.revoke(id, user.id, realUserId)
    setResponseStatus(event, 204)
    return null
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'REVOKE',
      entityType: 'Waiver',
      entityId: id,
      reason: error instanceof Error ? error.message : 'Failed to revoke waiver',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
