import type { ApiResponse, Repository } from '~~/types/api'
import { SourceRepositoryService } from '../services/source-repository.service'

/**
 * @openapi
 * /repositories:
 *   get:
 *     tags:
 *       - Repositories
 *     summary: List all repositories
 *     description: Retrieves a list of all repositories with their metadata and system counts
 *     responses:
 *       200:
 *         description: Successfully retrieved repositories
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
 *                         $ref: '#/components/schemas/Repository'
 *       500:
 *         description: Failed to fetch repositories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<Repository>> => {
  try {
    const sourceRepoService = new SourceRepositoryService()
    const result = await sourceRepoService.findAll()
    
    return {
      success: true,
      data: result.data,
      count: result.count
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch repositories'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
