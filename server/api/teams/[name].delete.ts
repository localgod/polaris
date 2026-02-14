import { TeamService } from '../../services/team.service'

/**
 * @openapi
 * /teams/{name}:
 *   delete:
 *     tags:
 *       - Teams
 *     summary: Delete a team
 *     description: |
 *       Deletes a team and all its relationships. Requires superuser access.
 *       
 *       **Authorization:** Superuser
 *       
 *       **Business Rules:**
 *       - Team cannot be deleted if it owns any systems
 *       - All systems must be reassigned or deleted first
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Team name
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       204:
 *         description: Team deleted successfully
 *       400:
 *         description: Team name is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Team not found
 *       409:
 *         description: Cannot delete team that owns systems
 *         content:
 *           application/json:
 *             example:
 *               statusCode: 409
 *               message: "Cannot delete team 'frontend-team' because it owns 3 system(s). Please reassign or delete the systems first."
 */
export default defineEventHandler(async (event) => {
  // Require superuser access for deleting teams
  const user = await requireSuperuser(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Team name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  
  const teamService = new TeamService()
  await teamService.delete(name, user.id)
  
  setResponseStatus(event, 204)
  return null
})
