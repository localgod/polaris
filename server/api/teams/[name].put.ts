import { TeamService } from '../../services/team.service'

/**
 * @openapi
 * /teams/{name}:
 *   put:
 *     tags:
 *       - Teams
 *     summary: Update a team
 *     description: Updates a team's email and/or responsibility area. Requires superuser access.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Team name
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New team name (for renaming)
 *               email:
 *                 type: string
 *               responsibilityArea:
 *                 type: string
 *     responses:
 *       200:
 *         description: Team updated successfully
 *       400:
 *         description: Team name is required
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Team not found
 *       422:
 *         description: At least one field to update is required
 */
export default defineEventHandler(async (event) => {
  const user = await requireSuperuser(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Team name is required'
    })
  }

  const name = decodeURIComponent(rawName)
  const body = await readBody(event)

  const teamService = new TeamService()
  const updatedName = await teamService.update({
    name,
    newName: body?.name,
    email: body?.email,
    responsibilityArea: body?.responsibilityArea,
    userId: user.id
  })

  return {
    success: true,
    data: { name: updatedName }
  }
})
