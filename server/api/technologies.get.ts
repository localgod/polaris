import type { ApiResponse, Technology } from '~~/types/api'
import { technologyService } from '../services/singletons'

/**
 * @openapi
 * /technologies:
 *   get:
 *     tags:
 *       - Technologies
 *     summary: List all technologies
 *     description: Retrieves a list of all technologies with their versions and approvals
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive substring match on technology name
 *     responses:
 *       200:
 *         description: Successfully retrieved technologies
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
 *                         $ref: '#/components/schemas/Technology'
 *                     total:
 *                       type: integer
 *                       description: Total number of technologies
 *       500:
 *         description: Failed to fetch technologies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<Technology>> => {
  try {
    const query = getQuery(event)
    const rawLimit = query.limit ? parseInt(query.limit as string, 10) : 50
    const rawOffset = query.offset ? parseInt(query.offset as string, 10) : 0

    if (isNaN(rawLimit) || isNaN(rawOffset)) {
      return { success: false, error: 'limit and offset must be valid integers', data: [] }
    }

    const limit = Math.min(Math.max(1, rawLimit), 200)
    const offset = Math.max(0, rawOffset)

    const result = await technologyService.findAll(
      {
        sortBy: query.sortBy as string | undefined,
        sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc'
      },
      limit,
      offset,
      query.search as string | undefined
    )

    return {
      success: true,
      data: result.data,
      count: result.count,
      total: result.total
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch technologies'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
