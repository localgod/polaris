/**
 * @openapi
 * /teams/{name}/usage:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Get team technology usage
 *     description: |
 *       Retrieves all technologies used by a team with usage statistics and compliance status.
 *       
 *       **Compliance Status:**
 *       - `compliant`: Technology is approved (invest/tolerate)
 *       - `unapproved`: No approval exists
 *       - `migration-needed`: Technology is marked for migration
 *       - `violation`: Technology is marked for elimination
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Team name
 *         example: frontend-team
 *     responses:
 *       200:
 *         description: Team usage retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     team:
 *                       type: string
 *                     usage:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           technology:
 *                             type: string
 *                           type:
 *                             type: string
 *                           vendor:
 *                             type: string
 *                           systemCount:
 *                             type: integer
 *                           firstUsed:
 *                             type: string
 *                             format: date
 *                           lastVerified:
 *                             type: string
 *                             format: date
 *                           approvalStatus:
 *                             type: string
 *                             enum: [invest, tolerate, migrate, eliminate]
 *                           complianceStatus:
 *                             type: string
 *                             enum: [compliant, unapproved, migration-needed, violation, unknown]
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalTechnologies:
 *                           type: integer
 *                         compliant:
 *                           type: integer
 *                         unapproved:
 *                           type: integer
 *                         violations:
 *                           type: integer
 *                         migrationNeeded:
 *                           type: integer
 *             example:
 *               success: true
 *               data:
 *                 team: frontend-team
 *                 usage:
 *                   - technology: React
 *                     type: framework
 *                     vendor: Meta
 *                     systemCount: 8
 *                     firstUsed: "2023-01-15"
 *                     lastVerified: "2025-10-20"
 *                     approvalStatus: invest
 *                     complianceStatus: compliant
 *                 summary:
 *                   totalTechnologies: 15
 *                   compliant: 12
 *                   unapproved: 2
 *                   violations: 0
 *                   migrationNeeded: 1
 *       400:
 *         description: Team name is required
 *       500:
 *         description: Failed to fetch team usage
 */
import { TeamService } from '../../../services/team.service'

export default defineEventHandler(async (event) => {
  const teamName = getRouterParam(event, 'name')
  
  if (!teamName) {
    throw createError({
      statusCode: 400,
      message: 'Team name is required'
    })
  }
  
  const decodedTeamName = decodeURIComponent(teamName)
  
  try {
    const teamService = new TeamService()
    const result = await teamService.findUsage(decodedTeamName)
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch team usage: ${error}`
    })
  }
})
