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
    const scope = query.scope as string | undefined
    const status = query.status as string | undefined
    const enforcedBy = query.enforcedBy as string | undefined
    const ruleType = query.ruleType as string | undefined
    
    const policyService = new PolicyService()
    const result = await policyService.findAll({ scope, status, enforcedBy, ruleType })
    
    return {
      success: true,
      data: result.data,
      count: result.count
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
