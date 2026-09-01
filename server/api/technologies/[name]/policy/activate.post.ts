/**
 * @openapi
 * /technologies/{name}/policy/activate:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Activate the draft TIME policy for a technology
 *     description: |
 *       Transitions the draft TechnologyPolicy to active status, making it the authoritative
 *       organization-level TIME decision for this technology. Any previously active policy is
 *       automatically archived. Requires org-admin role.
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
 *                 description: ID of the draft policy to activate
 *     responses:
 *       200:
 *         description: Policy activated
 *       403:
 *         description: Org-admin access required
 *       404:
 *         description: Draft policy not found
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
    const result = await policyService.activate(body.policyId, user.id, realUserId, event.context.correlationId)
    return sendSuccess(event, result)
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'ACTIVATE_POLICY',
      entityType: 'Technology',
      entityId: technologyName,
      reason: error instanceof Error ? error.message : 'Failed to activate technology policy',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
