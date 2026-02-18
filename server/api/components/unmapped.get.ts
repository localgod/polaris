import type { ApiResponse, UnmappedComponent } from '~~/types/api'
import { ComponentService } from '../../services/component.service'

/**
 * @openapi
 * /components/unmapped:
 *   get:
 *     tags:
 *       - Components
 *     summary: Get all unmapped components
 *     description: |
 *       Retrieves all components across all systems that are not mapped to a known technology.
 *       
 *       Results are ordered by system count (most used first) to help prioritize mapping efforts.
 *       
 *       **Use Cases:**
 *       - Identify components that need technology mapping
 *       - Find widely-used internal libraries
 *       - Discover shadow IT or unapproved dependencies
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 200
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/UnmappedComponent'
 *                       - type: object
 *                         properties:
 *                           systems:
 *                             type: array
 *                             items:
 *                               type: string
 *                           systemCount:
 *                             type: integer
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
 *                   systems: ["web-portal", "admin-dashboard", "mobile-api"]
 *                   systemCount: 3
 *               count: 1
 *               total: 1
 *       500:
 *         description: Failed to fetch unmapped components
 */
export default defineEventHandler(async (event): Promise<ApiResponse<UnmappedComponent>> => {
  await requireAuth(event)

  try {
    const query = getQuery(event)

    // Validate and clamp pagination parameters
    const rawLimit = query.limit ? parseInt(query.limit as string, 10) : 50
    const rawOffset = query.offset ? parseInt(query.offset as string, 10) : 0

    if (Number.isNaN(rawLimit) || Number.isNaN(rawOffset)) {
      setResponseStatus(event, 400)
      return { success: false, error: 'limit and offset must be valid integers', data: [] }
    }

    const limit = Math.min(Math.max(1, rawLimit), 200)
    const offset = Math.max(0, rawOffset)

    const componentService = new ComponentService()
    const result = await componentService.findUnmapped(limit, offset, {
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    })
    
    return {
      success: true,
      data: result.data,
      count: result.count,
      total: result.total
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch unmapped components'
    setResponseStatus(event, 500)
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
