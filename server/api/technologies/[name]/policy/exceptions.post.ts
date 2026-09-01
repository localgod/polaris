/**
 * @openapi
 * /technologies/{name}/policy/exceptions:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Create a scoped exception to the active TIME policy
 *     description: |
 *       Creates a PolicyException that temporarily overrides the active TechnologyPolicy for a
 *       specific team or system. Exceptions must have an expiry date and carry a mandatory reason.
 *       Requires org-admin role.
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
 *               - time
 *               - reason
 *               - scope
 *               - scopeName
 *               - effectiveDate
 *               - expiresAt
 *             properties:
 *               time:
 *                 type: string
 *                 enum: [tolerate, invest, migrate, eliminate]
 *               reason:
 *                 type: string
 *               scope:
 *                 type: string
 *                 enum: [team, system]
 *               scopeName:
 *                 type: string
 *               environment:
 *                 type: string
 *                 enum: [dev, test, staging, prod]
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *               expiresAt:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Exception created
 *       403:
 *         description: Org-admin access required
 *       409:
 *         description: No active policy exists for this technology
 *       422:
 *         description: Invalid input
 */
import { policyService } from '../../../../services/singletons'
import { sendCreated } from '../../../../utils/response'
import { auditFailedOperation } from '../../../../utils/audit'

interface CreateExceptionRequest {
  time: string
  reason: string
  scope: string
  scopeName: string
  environment?: string | null
  effectiveDate: string
  expiresAt: string
}

export default defineEventHandler(async (event) => {
  const user = await requireOrgAdmin(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) throw createError({ statusCode: 400, message: 'Technology name is required' })
  const technologyName = decodeURIComponent(rawName)

  const body = await readBody<CreateExceptionRequest>(event)
  if (!body?.time || !body?.reason || !body?.scope || !body?.scopeName || !body?.effectiveDate || !body?.expiresAt) {
    throw createError({ statusCode: 400, message: 'time, reason, scope, scopeName, effectiveDate, and expiresAt are required' })
  }

  try {
    const result = await policyService.createException({
      technologyName,
      time: body.time,
      reason: body.reason,
      approver: user.name ?? user.email,
      scope: body.scope,
      scopeName: body.scopeName,
      environment: body.environment ?? null,
      effectiveDate: body.effectiveDate,
      expiresAt: body.expiresAt,
      userId: user.id,
      realUserId,
      correlationId: event.context.correlationId
    })
    return sendCreated(event, result)
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'CREATE_POLICY_EXCEPTION',
      entityType: 'Technology',
      entityId: technologyName,
      reason: error instanceof Error ? error.message : 'Failed to create policy exception',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
