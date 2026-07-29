/**
 * @openapi
 * /systems/{name}:
 *   put:
 *     tags:
 *       - Systems
 *     summary: Fully update/replace a system
 *     description: |
 *       Replaces all system fields. All required fields must be provided.
 *       
 *       **Authorization:** Team Owner - User must belong to the team that owns the system
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - ownerTeam
 *               - businessCriticality
 *               - environment
 *             properties:
 *               domain:
 *                 type: string
 *               ownerTeam:
 *                 type: string
 *               businessCriticality:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               environment:
 *                 type: string
 *                 enum: [dev, test, staging, prod]
 *               description:
 *                 type: string
 *           example:
 *             domain: customer-experience
 *             ownerTeam: frontend-team
 *             businessCriticality: critical
 *             environment: prod
 *             description: Customer-facing web portal
 *     responses:
 *       200:
 *         description: System updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *       400:
 *         description: System name is required or missing required fields
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User does not belong to team that owns this system
 *       404:
 *         description: System not found
 *       422:
 *         description: Validation error - invalid field values
 */
import { systemService } from '../../services/singletons'
import { auditFailedOperation } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requireAuthorization(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }

  const name = decodeURIComponent(rawName)

  await validateTeamOwnership(event, 'System', name)

  const body = await readBody(event)

  try {
    const data = await systemService.updatePut(name, {
      domain: body.domain,
      ownerTeam: body.ownerTeam,
      businessCriticality: body.businessCriticality,
      environment: body.environment,
      description: body.description
    }, user.id, realUserId)

    return {
      success: true,
      data
    }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'UPDATE',
      entityType: 'System',
      entityId: name,
      reason: error instanceof Error ? error.message : 'Failed to update system',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
