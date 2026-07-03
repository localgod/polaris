import type { ApiResponse, Platform } from '~~/types/api'
import { platformService } from '../services/singletons'

/**
 * @openapi
 * /platforms:
 *   get:
 *     tags:
 *       - Platforms
 *     summary: List all platforms
 *     description: Retrieves a list of manually-declared platforms (infrastructure/services not observable via SBOM scanning) with their approvals
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
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive substring match on platform name
 *     responses:
 *       200:
 *         description: Successfully retrieved platforms
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
 *                         $ref: '#/components/schemas/Platform'
 *                     total:
 *                       type: integer
 *                       description: Total number of platforms
 *       500:
 *         description: Failed to fetch platforms
 */
export default defineEventHandler(async (event): Promise<ApiResponse<Platform>> => {
  try {
    const query = getQuery(event)
    const rawLimit = query.limit ? parseInt(query.limit as string, 10) : 50
    const rawOffset = query.offset ? parseInt(query.offset as string, 10) : 0

    if (isNaN(rawLimit) || isNaN(rawOffset)) {
      return { success: false, error: 'limit and offset must be valid integers', data: [] }
    }

    const limit = Math.min(Math.max(1, rawLimit), 200)
    const offset = Math.max(0, rawOffset)

    const result = await platformService.findAll(
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch platforms'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
