/**
 * @openapi
 * /policies/violations:
 *   get:
 *     tags:
 *       - Policies
 *     summary: Get policy violations
 *     description: |
 *       Retrieves version-constraint policy violations across the organization.
 *       
 *       A violation occurs when a component's version falls outside the
 *       allowed range defined by an active version-constraint policy that
 *       governs the component's technology.
 *       
 *       Results are ordered by severity (critical first) then by team and technology name.
 *     parameters:
 *       - in: query
 *         name: severity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [critical, error, warning, info]
 *         description: Filter by policy severity
 *       - in: query
 *         name: team
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by team name
 *       - in: query
 *         name: technology
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by technology name
 *     responses:
 *       200:
 *         description: Policy violations retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       team:
 *                         type: string
 *                       system:
 *                         type: string
 *                       component:
 *                         type: string
 *                       componentVersion:
 *                         type: string
 *                       technology:
 *                         type: string
 *                       technologyCategory:
 *                         type: string
 *                       violationType:
 *                         type: string
 *                         enum: [version-out-of-range]
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
 *                           versionRange:
 *                             type: string
 *                           enforcedBy:
 *                             type: string
 *                 count:
 *                   type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     critical:
 *                       type: integer
 *                     error:
 *                       type: integer
 *                     warning:
 *                       type: integer
 *                     info:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 - team: frontend-team
 *                   system: web-app
 *                   component: jquery
 *                   componentVersion: "3.6.0"
 *                   technology: jQuery
 *                   technologyCategory: library
 *                   violationType: version-out-of-range
 *                   policy:
 *                     name: react-version-policy
 *                     description: React must be version 18 or higher
 *                     severity: error
 *                     ruleType: version-constraint
 *                     versionRange: ">=18.0.0"
 *                     enforcedBy: architecture-team
 *               count: 1
 *               summary:
 *                 critical: 0
 *                 error: 1
 *                 warning: 0
 *                 info: 0
 *       500:
 *         description: Failed to fetch policy violations
 */
import { PolicyService } from '../../services/policy.service'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  try {
    const query = getQuery(event)
    const policyService = new PolicyService()
    
    const result = await policyService.getViolations({
      severity: query.severity as string | undefined,
      team: query.team as string | undefined,
      technology: query.technology as string | undefined
    })
    
    return {
      success: true,
      ...result
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policy violations'
    return {
      success: false,
      error: errorMessage,
      data: [],
      count: 0,
      summary: { critical: 0, error: 0, warning: 0, info: 0 }
    }
  }
})
