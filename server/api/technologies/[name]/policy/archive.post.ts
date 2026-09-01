/**
 * @openapi
 * /technologies/{name}/policy/archive:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Archive the active or draft TIME policy for a technology
 *     description: |
 *       Sets the policy status to 'archived'. The technology will return to 'unclassified'
 *       until a new policy is proposed and activated. Requires org-admin role.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policyId
 *             properties:
 *               policyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Policy archived
 *       403:
 *         description: Org-admin access required
 *       404:
 *         description: Policy not found
 */
import { policyService } from '../../../../services/singletons'
import { sendSuccess } from '../../../../utils/response'
import { auditFailedOperation } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requireOrgAdmin(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) throw createError({ statusCode: 400, message: 'Technology name is required' })
  const technologyName = decodeURIComponent(rawName)

  const body = await readBody<{ policyId: string }>(event)
  if (!body?.policyId) throw createError({ statusCode: 400, message: 'policyId is required' })

  try {
    const result = await policyService.archive(body.policyId, user.id, realUserId, event.context.correlationId)
    return sendSuccess(event, result)
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'ARCHIVE_POLICY',
      entityType: 'Technology',
      entityId: technologyName,
      reason: error instanceof Error ? error.message : 'Failed to archive technology policy',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
