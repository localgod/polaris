/**
 * @openapi
 * /technologies/{name}/policy/exceptions/{exceptionId}:
 *   delete:
 *     tags:
 *       - Technologies
 *     summary: Revoke a policy exception
 *     description: |
 *       Marks the exception as revoked. The org policy becomes effective immediately for the
 *       previously excepted scope. Requires org-admin role.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *       - in: path
 *         name: exceptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Exception ID
 *     responses:
 *       200:
 *         description: Exception revoked
 *       403:
 *         description: Org-admin access required
 *       404:
 *         description: Exception not found or already revoked
 */
import { policyService } from '../../../../../services/singletons'
import { sendSuccess } from '../../../../../utils/response'
import { auditFailedOperation } from '../../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requireOrgAdmin(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')
  const exceptionId = getRouterParam(event, 'exceptionId')
  if (!rawName) throw createError({ statusCode: 400, message: 'Technology name is required' })
  if (!exceptionId) throw createError({ statusCode: 400, message: 'exceptionId is required' })
  const technologyName = decodeURIComponent(rawName)

  try {
    const result = await policyService.revokeException(exceptionId, user.id, realUserId, event.context.correlationId)
    return sendSuccess(event, result)
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'REVOKE_POLICY_EXCEPTION',
      entityType: 'Technology',
      entityId: technologyName,
      reason: error instanceof Error ? error.message : 'Failed to revoke policy exception',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
