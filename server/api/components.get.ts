import type { ApiResponse, Component } from '~~/types/api'
import { ComponentService } from '../services/component.service'

/**
 * @openapi
 * /components:
 *   get:
 *     tags:
 *       - Components
 *     summary: List all components
 *     description: Retrieves a list of components with their metadata and system usage counts. Supports filtering and pagination.
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
 *         description: Filter by package manager (e.g., npm, maven, pypi, nuget, cargo)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by component type (e.g., library, framework, application)
 *       - in: query
 *         name: technology
 *         schema:
 *           type: string
 *         description: Filter by mapped technology name
 *       - in: query
 *         name: license
 *         schema:
 *           type: string
 *         description: Filter by license SPDX ID (e.g., MIT, Apache-2.0)
 *       - in: query
 *         name: hasLicense
 *         schema:
 *           type: boolean
 *         description: Filter by license presence (ignored when license is also specified)
 *       - in: query
 *         name: system
 *         schema:
 *           type: string
 *         description: Filter by system name (only components used by this system)
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
 *         description: Successfully retrieved components
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
 *                         $ref: '#/components/schemas/Component'
 *                     total:
 *                       type: integer
 *                       description: Total count of components matching filters (without pagination)
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch components
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<Component>> => {
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

    const filters = {
      search: query.search as string | undefined,
      packageManager: query.packageManager as string | undefined,
      type: query.type as string | undefined,
      technology: query.technology as string | undefined,
      license: query.license as string | undefined,
      hasLicense: query.hasLicense === 'true' ? true : query.hasLicense === 'false' ? false : undefined,
      system: query.system as string | undefined,
      limit,
      offset,
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    }

    const componentService = new ComponentService()
    const result = await componentService.findAll(filters)
    
    return {
      success: true,
      data: result.data,
      count: result.count,
      total: result.total
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch components'
    setResponseStatus(event, 500)
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
