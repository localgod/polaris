/**
 * @openapi
 * /teams/{name}/policies:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Get team policies
 *     description: |
 *       Retrieves policies enforced by and applicable to a specific team.
 *       
 *       Returns two categories:
 *       - **Enforced**: Policies this team is responsible for enforcing
 *       - **Subject To**: Policies that apply to this team
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
 *         description: Team policies retrieved successfully
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
 *                     enforced:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Policy'
 *                     subjectTo:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Policy'
 *                           - type: object
 *                             properties:
 *                               enforcedBy:
 *                                 type: string
 *                     enforcedCount:
 *                       type: integer
 *                     subjectToCount:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 team: frontend-team
 *                 enforced:
 *                   - name: react-version-policy
 *                     description: All React versions must be 18.x or higher
 *                     ruleType: version-constraint
 *                     severity: high
 *                     status: active
 *                 subjectTo:
 *                   - name: security-scanning-policy
 *                     description: All systems must have security scanning enabled
 *                     ruleType: security
 *                     severity: critical
 *                     status: active
 *                     enforcedBy: security-team
 *                 enforcedCount: 1
 *                 subjectToCount: 1
 *       400:
 *         description: Team name is required
 *       500:
 *         description: Failed to fetch team policies
 */
import { TeamService } from '../../../services/team.service'

export default defineEventHandler(async (event) => {
  try {
    const teamName = getRouterParam(event, 'name')
    
    if (!teamName) {
      throw createError({
        statusCode: 400,
        message: 'Team name is required'
      })
    }
    
    const teamService = new TeamService()
    const result = await teamService.findPolicies(teamName)
    
    return {
      success: true,
      data: result
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team policies'
    return {
      success: false,
      error: errorMessage
    }
  }
})
