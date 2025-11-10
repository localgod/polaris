import { SystemService } from '../../services/system.service'

/**
 * @openapi
 * /systems/{name}:
 *   delete:
 *     tags:
 *       - Systems
 *     summary: Delete a system
 *     description: Deletes a system and all its relationships (requires authorization and team ownership)
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       204:
 *         description: System deleted successfully
 *       400:
 *         description: System name is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user's team does not own this system
 *       404:
 *         description: System not found
 */
export default defineEventHandler(async (event) => {
  // Require authorization (authenticated + team membership)
  await requireAuthorization(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  
  // Validate that user's team owns this system
  await validateTeamOwnership(event, 'System', name)
  
  const systemService = new SystemService()
  await systemService.delete(name)
  
  setResponseStatus(event, 204)
  return null
})
