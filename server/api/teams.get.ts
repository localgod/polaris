import type { ApiResponse, Team } from '~~/types/api'
import { teamService } from '../services/singletons'

/**
 * @openapi
 * /teams:
 *   get:
 *     tags:
 *       - Teams
 *     summary: List all teams
 *     description: Retrieves a list of all teams with their technology and system counts
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
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
 *                     total:
 *                       type: integer
 *                       description: Total number of teams
 *       500:
 *         description: Failed to fetch teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<Team>> => {
  try {
    const query = getQuery(event)
    const rawLimit = query.limit ? parseInt(query.limit as string, 10) : 50
    const rawOffset = query.offset ? parseInt(query.offset as string, 10) : 0

    if (isNaN(rawLimit) || isNaN(rawOffset)) {
      return { success: false, error: 'limit and offset must be valid integers', data: [] }
    }

    const limit = Math.min(Math.max(1, rawLimit), 200)
    const offset = Math.max(0, rawOffset)

    const result = await teamService.findAll(
      {
        sortBy: query.sortBy as string | undefined,
        sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc'
      },
      limit,
      offset
    )

    return {
      success: true,
      data: result.data,
      count: result.count,
      total: result.total
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
