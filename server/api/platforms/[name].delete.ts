import { platformService } from '../../services/singletons'

/**
 * @openapi
 * /platforms/{name}:
 *   delete:
 *     tags:
 *       - Platforms
 *     summary: Delete a platform
 *     description: Deletes a platform and all its relationships. Requires superuser role or membership in the platform's steward team.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Platform name
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       204:
 *         description: Platform deleted
 *       400:
 *         description: Platform name is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user is not a superuser and does not belong to the steward team
 *       404:
 *         description: Platform not found
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Platform name is required'
    })
  }

  const name = decodeURIComponent(rawName)

  const platform = await platformService.findStewardTeam(name)
  if (!platform) {
    throw createError({
      statusCode: 404,
      message: `Platform '${name}' not found`
    })
  }

  // Superusers can delete any platform
  if (user.role !== 'superuser') {
    // Regular users must belong to the steward team
    const userTeamNames = user.teams?.map((t: { name: string }) => t.name) || []
    if (!platform.stewardTeam || !userTeamNames.includes(platform.stewardTeam)) {
      throw createError({
        statusCode: 403,
        message: 'Access denied. You must be a superuser or a member of the platform\'s steward team to delete it.'
      })
    }
  }

  await platformService.delete(name, user.id, realUserId)

  setResponseStatus(event, 204)
  return null
})
