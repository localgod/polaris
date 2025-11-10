import type { ApiResponse, Component } from '~~/types/api'
import { ComponentService } from '../services/component.service'

/**
 * @openapi
 * /components:
 *   get:
 *     tags:
 *       - Components
 *     summary: List all components
 *     description: Retrieves a list of all components with their metadata and system usage counts
 *     responses:
 *       200:
 *         description: Successfully retrieved components
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
 *                         $ref: '#/components/schemas/Component'
 *       500:
 *         description: Failed to fetch components
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<Component>> => {
  try {
    const componentService = new ComponentService()
    const result = await componentService.findAll()
    
    return {
      success: true,
      data: result.data,
      count: result.count
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch components'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
