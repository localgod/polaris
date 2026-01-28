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
 *         description: Unmapped components retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UnmappedComponent'
 *                 count:
 *                   type: integer
 *                   description: Number of items in current page
 *                 total:
 *                   type: integer
 *                   description: Total number of unmapped components
 *             example:
 *               success: true
 *               data:
 *                 - name: "@company/internal-ui"
 *                   version: "2.1.0"
 *                   packageManager: npm
 *                   license: proprietary
 *               count: 1
 *               total: 1
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
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0
    
    const systemService = new SystemService()
    const result = await systemService.findUnmappedComponents(systemName)
    const total = result.components.length
    const paginatedData = result.components.slice(offset, offset + limit)

    return {
      success: true,
      data: paginatedData,
      count: paginatedData.length,
      total
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch unmapped components'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
