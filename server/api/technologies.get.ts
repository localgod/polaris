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
 *       500:
 *         description: Failed to fetch technologies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<Technology>> => {
  try {
    const technologyService = new TechnologyService()
    const result = await technologyService.findAll()
    
    return {
      success: true,
      ...result
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
