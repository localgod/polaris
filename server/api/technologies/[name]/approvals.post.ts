import { TechnologyService } from '../../../services/technology.service'

/**
 * @openapi
 * /technologies/{name}/approvals:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Set a team's TIME approval for a technology
 *     description: Creates or updates a team's APPROVES relationship on a technology. The user must be a member of the specified team or a superuser.
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
 *               - teamName
 *               - time
 *             properties:
 *               teamName:
 *                 type: string
 *               time:
 *                 type: string
 *                 enum: [tolerate, invest, migrate, eliminate]
 *               versionConstraint:
 *                 type: string
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
 *         description: Technology not found
 *       422:
 *         description: Invalid TIME value
 */

interface SetApprovalRequest {
  teamName: string
  time: string
  versionConstraint?: string
  notes?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Technology name is required' })
  }
  const technologyName = decodeURIComponent(rawName)

  const body = await readBody<SetApprovalRequest>(event)

  if (!body?.teamName || !body?.time) {
    throw createError({ statusCode: 400, message: 'teamName and time are required' })
  }

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

  const service = new TechnologyService()
  const result = await service.setApproval({
    technologyName,
    teamName: body.teamName,
    time: body.time,
    versionConstraint: body.versionConstraint,
    notes: body.notes,
    userId: user.id
  })

  return {
    success: true,
    data: result
  }
})
