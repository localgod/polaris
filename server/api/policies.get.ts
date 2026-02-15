import type { ApiResponse, Policy } from '~~/types/api'
import { PolicyService } from '../services/policy.service'

/**
 * @openapi
 * /policies:
 *   get:
 *     tags:
 *       - Policies
 *     summary: List all policies
 *     description: Retrieves a list of all policies with optional filtering
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *         description: Filter by policy scope
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by policy status
 *       - in: query
 *         name: enforcedBy
 *         schema:
 *           type: string
 *         description: Filter by enforcement mechanism
 *       - in: query
 *         name: ruleType
 *         schema:
 *           type: string
 *           enum: [technology-approval, license-compliance]
 *         description: Filter by policy rule type
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
 *         description: Successfully retrieved policies
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
 *                         $ref: '#/components/schemas/Policy'
 *                     total:
 *                       type: integer
 *                       description: Total number of policies
 *       500:
 *         description: Failed to fetch policies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<Policy>> => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0
    const scope = query.scope as string | undefined
    const status = query.status as string | undefined
    const enforcedBy = query.enforcedBy as string | undefined
    const ruleType = query.ruleType as string | undefined
    
    const policyService = new PolicyService()
    const result = await policyService.findAll({
      scope, status, enforcedBy, ruleType,
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    })
    const total = result.data.length
    const paginatedData = result.data.slice(offset, offset + limit)
    
    return {
      success: true,
      data: paginatedData,
      count: paginatedData.length,
      total
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policies'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
