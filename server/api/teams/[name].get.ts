import { TeamService } from '../../services/team.service'

/**
 * @openapi
 * /teams/{name}:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Get team details
 *     description: Retrieves detailed information about a specific team including technology ownership, system ownership, and member count
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Team name
 *         example: frontend-team
 *     responses:
 *       200:
 *         description: Team details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Team'
 *                         - type: object
 *                           properties:
 *                             usedTechnologyCount:
 *                               type: integer
 *                             memberCount:
 *                               type: integer
 *             example:
 *               success: true
 *               data:
 *                 name: frontend-team
 *                 email: frontend@example.com
 *                 responsibilityArea: Web Applications
 *                 technologyCount: 15
 *                 systemCount: 8
 *                 usedTechnologyCount: 20
 *                 memberCount: 5
 *       400:
 *         description: Team name is required
 *       404:
 *         description: Team not found
 */
export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Team name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  
  const teamService = new TeamService()
  const team = await teamService.findByName(name)
  
  if (!team) {
    throw createError({
      statusCode: 404,
      message: `Team '${name}' not found`
    })
  }
  
  return {
    success: true,
    data: team
  }
})
