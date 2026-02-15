import type { ApiResponse } from '~~/types/api'
import { LicenseRepository } from '../repositories/license.repository'
import type { License } from '../repositories/license.repository'

/**
 * @openapi
 * /licenses:
 *   get:
 *     tags:
 *       - Licenses
 *       - License Compliance
 *     summary: List all licenses
 *     description: Retrieves a list of all licenses discovered in components with usage statistics
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
 *         name: deprecated
 *         schema:
 *           type: boolean
 *         description: Filter by deprecated status
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
 *         description: Successfully retrieved licenses
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: SPDX identifier
 *                           name:
 *                             type: string
 *                             description: Human-readable name
 *                           spdxId:
 *                             type: string
 *                             description: Canonical SPDX identifier
 *                           osiApproved:
 *                             type: boolean
 *                             description: OSI approval status
 *                           url:
 *                             type: string
 *                             description: License text URL
 *                           category:
 *                             type: string
 *                             description: License category
 *                           deprecated:
 *                             type: boolean
 *                             description: Whether license is deprecated
 *                           componentCount:
 *                             type: integer
 *                             description: Number of components using this license
 *                     total:
 *                       type: integer
 *                       description: Total number of licenses
 *       500:
 *         description: Failed to fetch licenses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<License>> => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0
    const filters = {
      category: query.category as string | undefined,
      osiApproved: query.osiApproved === 'true' ? true : query.osiApproved === 'false' ? false : undefined,
      deprecated: query.deprecated === 'true' ? true : query.deprecated === 'false' ? false : undefined,
      search: query.search as string | undefined
    }
    
    const licenseRepo = new LicenseRepository()
    const allLicenses = await licenseRepo.findAll({
      ...filters,
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    })
    const total = allLicenses.length
    const paginatedLicenses = allLicenses.slice(offset, offset + limit)
    
    return {
      success: true,
      data: paginatedLicenses,
      count: paginatedLicenses.length,
      total
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch licenses'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
