import { LicenseService } from '../../../services/license.service'
import type { ApiResponse } from '~~/types/api'
import type { License } from '../../../repositories/license.repository'

/**
 * @openapi
 * /admin/licenses/whitelist:
 *   get:
 *     tags:
 *       - Admin
 *       - Licenses
 *     summary: Get license whitelist management data
 *     description: |
 *       Retrieves all licenses with whitelist status for superadmin management.
 *       Includes filtering and search capabilities.
 *       
 *       **Authorization:** Superuser only
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [permissive, copyleft, proprietary, public-domain, other]
 *         description: Filter by license category
 *       - in: query
 *         name: osiApproved
 *         schema:
 *           type: boolean
 *         description: Filter by OSI approval status
 *       - in: query
 *         name: whitelisted
 *         schema:
 *           type: boolean
 *         description: Filter by whitelist status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by license ID or name
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
 *         description: License whitelist data retrieved successfully
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
 *                       - type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           osiApproved:
 *                             type: boolean
 *                           whitelisted:
 *                             type: boolean
 *                           componentCount:
 *                             type: integer
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     whitelisted:
 *                       type: integer
 *                     byCategory:
 *                       type: object
 *             example:
 *               success: true
 *               data:
 *                 - id: MIT
 *                   name: MIT License
 *                   category: permissive
 *                   osiApproved: true
 *                   whitelisted: true
 *                   componentCount: 42
 *               count: 1
 *               total: 1
 *               statistics:
 *                 total: 25
 *                 whitelisted: 8
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 */
export default defineEventHandler(async (event): Promise<ApiResponse<License> & { statistics?: any }> => {
  // Require superuser access
  await requireSuperuser(event)

  try {
    const query = getQuery(event)
    const filters = {
      category: query.category as string | undefined,
      osiApproved: query.osiApproved === 'true' ? true : query.osiApproved === 'false' ? false : undefined,
      whitelisted: query.whitelisted === 'true' ? true : query.whitelisted === 'false' ? false : undefined,
      search: query.search as string | undefined,
      limit: query.limit ? Math.max(0, parseInt(query.limit as string, 10)) : 50,
      offset: query.offset ? Math.max(0, parseInt(query.offset as string, 10)) : 0
    }

    const licenseService = new LicenseService()
    
    // Get licenses with filters
    const result = await licenseService.findAll(filters)
    
    // Get statistics for dashboard
    const statistics = await licenseService.getStatistics()

    return {
      success: true,
      data: result.data,
      count: result.count,
      total: result.total,
      statistics
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch license whitelist data'
    setResponseStatus(event, 500)
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})