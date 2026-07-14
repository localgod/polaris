import { platformService } from '../../../services/singletons'
import { auditFailedOperation } from '../../../utils/audit'

/**
 * @openapi
 * /platforms/{name}/approvals:
 *   post:
 *     tags:
 *       - Platforms
 *     summary: Set a team's TIME approval for a platform
 *     description: Creates or updates a team's APPROVES relationship on a platform. The user must be a member of the specified team or a superuser.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Platform name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamName
 *               - time
 *             properties:
 *               teamName:
 *                 type: string
 *               time:
 *                 type: string
 *                 enum: [tolerate, invest, migrate, eliminate]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approval set
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: User is not a member of the specified team
 *       404:
 *         description: Platform not found
 *       422:
 *         description: Invalid TIME value
 */

interface SetApprovalRequest {
  teamName: string
  time: string
  environment?: string | null
  notes?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Platform name is required' })
  }
  const platformName = decodeURIComponent(rawName)

  const body = await readBody<SetApprovalRequest>(event)

  if (!body?.teamName || !body?.time) {
    throw createError({ statusCode: 400, message: 'teamName and time are required' })
  }

  try {
    // Verify user is a member of the team or a superuser
    if (user.role !== 'superuser') {
      const userTeamNames = user.teams?.map((t: { name: string }) => t.name) || []
      if (!userTeamNames.includes(body.teamName)) {
        throw createError({
          statusCode: 403,
          message: `You must be a member of '${body.teamName}' to set its TIME approval`
        })
      }
    }

    const result = await platformService.setApproval({
      platformName,
      teamName: body.teamName,
      time: body.time,
      environment: body.environment ?? null,
      notes: body.notes,
      userId: user.id,
      realUserId
    })

    return {
      success: true,
      data: result
    }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'APPROVE',
      entityType: 'Platform',
      entityId: platformName,
      reason: error instanceof Error ? error.message : 'Failed to set platform approval',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
