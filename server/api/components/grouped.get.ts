import type { ApiResponse, GroupedComponent } from '~~/types/api'
import { componentService } from '../../services/singletons'

/**
 * @openapi
 * /components/grouped:
 *   get:
 *     tags:
 *       - Components
 *     summary: List grouped components
 *     description: Retrieves components grouped by package manager, group, and name. Each group includes ordered version details for version-specific actions.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by component name, group, or package URL (case-insensitive)
 *       - in: query
 *         name: packageManager
 *         schema:
 *           type: string
 *         description: Filter by package manager
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by component type
 *       - in: query
 *         name: technology
 *         schema:
 *           type: string
 *         description: Filter by mapped technology name
 *       - in: query
 *         name: license
 *         schema:
 *           type: string
 *         description: Filter by license SPDX ID
 *       - in: query
 *         name: hasLicense
 *         schema:
 *           type: boolean
 *         description: Filter by license presence (ignored when license is also specified)
 *       - in: query
 *         name: system
 *         schema:
 *           type: string
 *         description: Filter to groups where any version is used by this system
 *       - in: query
 *         name: direct
 *         schema:
 *           type: boolean
 *         description: When true, restrict matching to direct dependencies. With system, applies to that system; otherwise applies across all systems.
 *       - in: query
 *         name: includeDev
 *         schema:
 *           type: boolean
 *         description: When false, hide dependencies whose matching USES edge is dev-scoped.
 *       - in: query
 *         name: depScope
 *         schema:
 *           type: string
 *           enum: [runtime, required, dev, optional, excluded]
 *         description: Filter matching by dependency scope on the USES edge (requires system)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, packageManager, type, systemCount]
 *         description: Field to sort grouped components by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 200
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Successfully retrieved grouped components
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
 *                         $ref: '#/components/schemas/GroupedComponent'
 *                     total:
 *                       type: integer
 *                       description: Total count of unique component groups matching filters
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch grouped components
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<GroupedComponent>> => {
  try {
    const query = getQuery(event)

    const rawLimit = query.limit ? parseInt(query.limit as string, 10) : 50
    const rawOffset = query.offset ? parseInt(query.offset as string, 10) : 0

    if (Number.isNaN(rawLimit) || Number.isNaN(rawOffset)) {
      setResponseStatus(event, 400)
      return { success: false, error: 'limit and offset must be valid integers', data: [] }
    }

    const limit = Math.min(Math.max(1, rawLimit), 200)
    const offset = Math.max(0, rawOffset)
    const sortBy = ['name', 'packageManager', 'type', 'systemCount'].includes(query.sortBy as string)
      ? query.sortBy as string
      : undefined

    const result = await componentService.findAllGrouped({
      search: query.search as string | undefined,
      packageManager: query.packageManager as string | undefined,
      type: query.type as string | undefined,
      technology: query.technology as string | undefined,
      license: query.license as string | undefined,
      hasLicense: query.hasLicense === 'true' ? true : query.hasLicense === 'false' ? false : undefined,
      system: query.system as string | undefined,
      directOnly: query.direct === 'true' ? true : undefined,
      includeDev: query.includeDev === 'false' ? false : undefined,
      depScope: query.depScope as string | undefined,
      limit,
      offset,
      sortBy,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    })

    return {
      success: true,
      data: result.data,
      count: result.count,
      total: result.total
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch grouped components'
    setResponseStatus(event, 500)
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
