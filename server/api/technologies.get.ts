import type { ApiResponse, Technology } from '~~/types/api'
import { TechnologyService } from '../services/technology.service'

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
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0

    const technologyService = new TechnologyService()
    const result = await technologyService.findAll({
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc'
    })
    const total = result.data.length
    const paginatedData = result.data.slice(offset, offset + limit)
    
    return {
      success: true,
      data: paginatedData,
      count: paginatedData.length,
      total
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
