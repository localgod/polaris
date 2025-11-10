import type { ApiResponse, Team } from '~~/types/api'
import { TeamService } from '../services/team.service'

/**
 * @openapi
 * /teams:
 *   get:
 *     tags:
 *       - Teams
 *     summary: List all teams
 *     description: Retrieves a list of all teams with their technology and system counts
 *     responses:
 *       200:
 *         description: Successfully retrieved teams
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Team'
 *       500:
 *         description: Failed to fetch teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<Team>> => {
  try {
    const teamService = new TeamService()
    const result = await teamService.findAll()
    
    return {
      success: true,
      ...result
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch teams'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
