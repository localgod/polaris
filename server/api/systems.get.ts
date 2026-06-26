import type { ApiResponse, System } from '~~/types/api'
import { systemService } from '../services/singletons'

/**
 * @openapi
 * /systems:
 *   get:
 *     tags:
 *       - Systems
 *     summary: List all systems
 *     description: Retrieves a list of all systems with their metadata, component counts, and repository counts
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
 *         description: Successfully retrieved systems
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
 *                         $ref: '#/components/schemas/System'
 *                     total:
 *                       type: integer
 *                       description: Total number of systems
 *       500:
 *         description: Failed to fetch systems
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<System>> => {
  try {
    const query = getQuery(event)
    const rawLimit = query.limit ? parseInt(query.limit as string, 10) : 50
    const rawOffset = query.offset ? parseInt(query.offset as string, 10) : 0

    if (isNaN(rawLimit) || isNaN(rawOffset)) {
      return { success: false, error: 'limit and offset must be valid integers', data: [] }
    }

    const limit = Math.min(Math.max(1, rawLimit), 200)
    const offset = Math.max(0, rawOffset)

    const search = (query.search as string | undefined)?.trim() || undefined

    const result = await systemService.findAll(
      {
        sortBy: query.sortBy as string | undefined,
        sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc'
      },
      limit,
      offset,
      search
    )

    return {
      success: true,
      data: result.data,
      count: result.count,
      total: result.total
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch systems'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
