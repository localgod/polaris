import type { ApiResponse } from '~~/types/api'
import { PolicyService } from '../../services/policy.service'
import type { LicenseViolation } from '../../repositories/policy.repository'

export interface LicenseViolationResponse extends ApiResponse<LicenseViolation> {
  total?: number
  summary?: {
    critical: number
    error: number
    warning: number
    info: number
  }
}

/**
 * @openapi
 * /policies/license-violations:
 *   get:
 *     tags:
 *       - Policies
 *       - License Compliance
 *     summary: Get license compliance violations
 *     description: Retrieves all license compliance violations with optional filtering. Returns components using licenses not allowed by active license compliance policies.
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, error, warning, info]
 *         description: Filter by violation severity
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         description: Filter by team name
 *       - in: query
 *         name: system
 *         schema:
 *           type: string
 *         description: Filter by system name
 *       - in: query
 *         name: license
 *         schema:
 *           type: string
 *         description: Filter by license ID (SPDX identifier)
 *     responses:
 *       200:
 *         description: Successfully retrieved license violations
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
 *                       team:
 *                         type: string
 *                         description: Team name
 *                       system:
 *                         type: string
 *                         description: System name
 *                       component:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           version:
 *                             type: string
 *                           purl:
 *                             type: string
 *                       license:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           osiApproved:
 *                             type: boolean
 *                       policy:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           severity:
 *                             type: string
 *                           ruleType:
 *                             type: string
 *                           enforcedBy:
 *                             type: string
 *                 count:
 *                   type: integer
 *                   description: Number of violations returned
 *                 summary:
 *                   type: object
 *                   description: Violation count by severity
 *                   properties:
 *                     critical:
 *                       type: integer
 *                     error:
 *                       type: integer
 *                     warning:
 *                       type: integer
 *                     info:
 *                       type: integer
 *       400:
 *         description: Invalid filter parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch license violations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<LicenseViolationResponse> => {
  try {
    const query = getQuery(event)
    const filters = {
      severity: query.severity as string | undefined,
      team: query.team as string | undefined,
      system: query.system as string | undefined,
      license: query.license as string | undefined,
      limit: query.limit ? parseInt(query.limit as string, 10) : undefined,
      offset: query.offset ? parseInt(query.offset as string, 10) : undefined
    }
    
    const policyService = new PolicyService()
    const result = await policyService.getLicenseViolations(filters)
    
    return {
      success: true,
      data: result.data,
      count: result.data.length,
      total: result.count,
      summary: result.summary
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch license violations'
    const statusCode = (error as { statusCode?: number })?.statusCode || 500
    
    return {
      success: false,
      error: errorMessage,
      data: [],
      ...(statusCode === 400 && { statusCode })
    }
  }
})
