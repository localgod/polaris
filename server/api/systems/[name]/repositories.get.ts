import { SystemService } from '../../../services/system.service'
import type { ApiResponse, Repository } from '~~/types/api'

/**
 * @openapi
 * /api/systems/{name}/repositories:
 *   get:
 *     tags:
 *       - Systems
 *     summary: List repositories for a system
 *     description: Returns all repositories linked to a system
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     responses:
 *       200:
 *         description: List of repositories
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
 *       404:
 *         description: System not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<Repository>> => {
  const systemName = getRouterParam(event, 'name')
  
  if (!systemName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }
  
  const systemService = new SystemService()
  const result = await systemService.getRepositories(systemName)
  
  return {
    success: true,
    ...result
  }
})
