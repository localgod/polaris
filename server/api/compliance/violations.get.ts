import { ComplianceService } from '../../services/compliance.service'

/**
 * @openapi
 * /compliance/violations:
 *   get:
 *     tags:
 *       - Compliance
 *     summary: Get compliance violations
 *     description: |
 *       Retrieves all compliance violations across the organization.
 *       
 *       A compliance violation occurs when:
 *       - A team uses a technology without approval (unapproved)
 *       - A team uses a technology marked for elimination (eliminated)
 *       
 *       Results include affected systems and migration targets where applicable.
 *     responses:
 *       200:
 *         description: Compliance violations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         violations:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               team:
 *                                 type: string
 *                               technology:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               systemCount:
 *                                 type: integer
 *                               systems:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                               violationType:
 *                                 type: string
 *                                 enum: [unapproved, eliminated]
 *                               notes:
 *                                 type: string
 *                                 nullable: true
 *                               migrationTarget:
 *                                 type: string
 *                                 nullable: true
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalViolations:
 *                               type: integer
 *                             teamsAffected:
 *                               type: integer
 *                             byTeam:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   team:
 *                                     type: string
 *                                   violationCount:
 *                                     type: integer
 *                                   systemsAffected:
 *                                     type: integer
 *             example:
 *               success: true
 *               data:
 *                 violations:
 *                   - team: frontend-team
 *                     technology: jQuery
 *                     type: library
 *                     systemCount: 3
 *                     systems: ["web-portal", "admin-dashboard"]
 *                     violationType: eliminated
 *                     notes: Migrate to modern framework
 *                     migrationTarget: React
 *                 summary:
 *                   totalViolations: 1
 *                   teamsAffected: 1
 *                   byTeam:
 *                     - team: frontend-team
 *                       violationCount: 1
 *                       systemsAffected: 3
 *       500:
 *         description: Failed to fetch compliance violations
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  try {
    const complianceService = new ComplianceService()
    const result = await complianceService.findViolations()
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch compliance violations: ${error}`
    })
  }
})
