import { SystemService } from '../../../services/system.service'

/**
 * @openapi
 * /systems/{name}/unmapped-components:
 *   get:
 *     tags:
 *       - Systems
 *     summary: Get unmapped components for a system
 *     description: |
 *       Retrieves all components used by a system that are not mapped to a known technology.
 *       
 *       These components need manual review to determine if they should be:
 *       - Mapped to an existing technology
 *       - Added as a new technology
 *       - Marked as internal/proprietary
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *         example: web-portal
 *     responses:
 *       200:
 *         description: Unmapped components retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         system:
 *                           type: string
 *                         components:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/UnmappedComponent'
 *                         count:
 *                           type: integer
 *             example:
 *               success: true
 *               data:
 *                 system: web-portal
 *                 components:
 *                   - name: "@company/internal-ui"
 *                     version: "2.1.0"
 *                     packageManager: npm
 *                     license: proprietary
 *                 count: 1
 *       400:
 *         description: System name is required
 *       404:
 *         description: System not found
 *       500:
 *         description: Failed to fetch unmapped components
 */
export default defineEventHandler(async (event) => {
  try {
    const rawName = getRouterParam(event, 'name')
    
    if (!rawName) {
      throw createError({
        statusCode: 400,
        message: 'System name is required'
      })
    }
    
    const systemName = decodeURIComponent(rawName)
    
    const systemService = new SystemService()
    const result = await systemService.findUnmappedComponents(systemName)

    return {
      success: true,
      data: result
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch unmapped components'
    return {
      success: false,
      error: errorMessage,
      data: {
        system: '',
        components: [],
        count: 0
      }
    }
  }
})
