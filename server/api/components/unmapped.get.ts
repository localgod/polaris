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
 *       500:
 *         description: Failed to fetch unmapped components
 */
export default defineEventHandler(async (): Promise<ApiResponse<UnmappedComponent>> => {
  try {
    const componentService = new ComponentService()
    const result = await componentService.findUnmapped()
    
    return {
      success: true,
      ...result
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch unmapped components'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
