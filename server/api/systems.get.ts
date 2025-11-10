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
 *       500:
 *         description: Failed to fetch systems
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<System>> => {
  try {
    const systemService = new SystemService()
    const result = await systemService.findAll()
    
    return {
      success: true,
      ...result
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
