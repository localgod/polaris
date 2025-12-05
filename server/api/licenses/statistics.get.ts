import type { ApiResponse } from '~~/types/api'
import { LicenseRepository } from '../../repositories/license.repository'

interface LicenseStatistics {
  total: number
  byCategory: Record<string, number>
  osiApproved: number
  deprecated: number
}

/**
 * @openapi
 * /licenses/statistics:
 *   get:
 *     tags:
 *       - Licenses
 *       - License Compliance
 *     summary: Get license statistics
 *     description: Retrieves organization-wide license statistics including counts by category, OSI approval, and deprecation status
 *     responses:
 *       200:
 *         description: Successfully retrieved license statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       total:
 *                         type: integer
 *                         description: Total number of unique licenses
 *                       byCategory:
 *                         type: object
 *                         description: License count by category
 *                         properties:
 *                           permissive:
 *                             type: integer
 *                           copyleft:
 *                             type: integer
 *                           proprietary:
 *                             type: integer
 *                           public-domain:
 *                             type: integer
 *                           other:
 *                             type: integer
 *                       osiApproved:
 *                         type: integer
 *                         description: Number of OSI-approved licenses
 *                       deprecated:
 *                         type: integer
 *                         description: Number of deprecated licenses
 *                 count:
 *                   type: integer
 *                   example: 1
 *       500:
 *         description: Failed to fetch license statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<LicenseStatistics>> => {
  try {
    const licenseRepo = new LicenseRepository()
    const statistics = await licenseRepo.getStatistics()
    
    return {
      success: true,
      data: [statistics],
      count: 1
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch license statistics'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
