import { LicenseRepository } from '../../repositories/license.repository'
import type { ApiResponse, LicenseViolation } from '~~/types/api'

/**
 * @openapi
 * /licenses/violations:
 *   get:
 *     tags:
 *       - Licenses
 *     summary: Get license violations
 *     description: Returns components using disallowed licenses. Supports pagination, sorting, and search.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by component name, license ID, system name, or team name (case-insensitive)
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [componentName, componentVersion, licenseId, systemName, teamName]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: License violations
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Failed to fetch license violations
 */
export default defineEventHandler(async (event): Promise<ApiResponse<LicenseViolation>> => {
  try {
    await requireAuth(event)
    const query = getQuery(event)

    const rawLimit = query.limit ? parseInt(query.limit as string, 10) : 50
    const rawOffset = query.offset ? parseInt(query.offset as string, 10) : 0

    if (Number.isNaN(rawLimit) || Number.isNaN(rawOffset)) {
      setResponseStatus(event, 400)
      return { success: false, error: 'limit and offset must be valid integers', data: [] }
    }

    const limit = Math.min(Math.max(1, rawLimit), 200)
    const offset = Math.max(0, rawOffset)

    const filters = {
      search: query.search as string | undefined,
      limit,
      offset,
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    }

    const repo = new LicenseRepository()
    const result = await repo.findViolations(filters)

    return {
      success: true,
      data: result.data,
      count: result.data.length,
      total: result.total
    }
  } catch (error: unknown) {
    // Re-throw H3 errors (e.g. 401 from requireAuth) to preserve status codes
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch license violations'
    setResponseStatus(event, 500)
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
