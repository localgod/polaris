import { TechnologyService } from '../../services/technology.service'

/**
 * @openapi
 * /technologies/{name}:
 *   delete:
 *     tags:
 *       - Technologies
 *     summary: Delete a technology
 *     description: Deletes a technology and all its relationships. Requires superuser role or membership in the technology's owner team.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       204:
 *         description: Technology deleted
 *       400:
 *         description: Technology name is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user is not a superuser and does not belong to the owner team
 *       404:
 *         description: Technology not found
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Technology name is required'
    })
  }

  const name = decodeURIComponent(rawName)
  const service = new TechnologyService()

  const tech = await service.findOwnerTeam(name)
  if (!tech) {
    throw createError({
      statusCode: 404,
      message: `Technology '${name}' not found`
    })
  }

  // Superusers can delete any technology
  if (user.role !== 'superuser') {
    // Regular users must belong to the owner team
    const userTeamNames = user.teams?.map((t: { name: string }) => t.name) || []
    if (!tech.ownerTeam || !userTeamNames.includes(tech.ownerTeam)) {
      throw createError({
        statusCode: 403,
        message: 'Access denied. You must be a superuser or a member of the technology\'s owner team to delete it.'
      })
    }
  }

  await service.delete(name)

  setResponseStatus(event, 204)
  return null
})
