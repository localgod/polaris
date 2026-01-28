import type { ApiResponse, System } from '~~/types/api'
import { SystemService } from '../services/system.service'

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
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0

    const systemService = new SystemService()
    const result = await systemService.findAll()
    const total = result.data.length
    const paginatedData = result.data.slice(offset, offset + limit)
    
    return {
      success: true,
      data: paginatedData,
      count: paginatedData.length,
      total
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
