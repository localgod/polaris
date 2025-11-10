/**
 * @openapi
 * /approvals:
 *   get:
 *     tags:
 *       - Approvals
 *     summary: Check technology approval status
 *     description: |
 *       Checks if a technology (and optionally a specific version) is approved for a team.
 *       
 *       **Approval Hierarchy:**
 *       1. Version-specific approval (highest priority) - `level: "version"`
 *       2. Technology-level approval - `level: "technology"`
 *       3. Default (not approved) - `level: "default"`, `time: "eliminate"`
 *       
 *       **TIME Framework Values:**
 *       - `adopt` - Recommended for use
 *       - `trial` - Experimental use allowed
 *       - `assess` - Under evaluation
 *       - `hold` - Do not use for new projects
 *       - `eliminate` - Must be removed
 *     parameters:
 *       - in: query
 *         name: team
 *         required: true
 *         schema:
 *           type: string
 *         description: Team name
 *         example: frontend-team
 *       - in: query
 *         name: technology
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *         example: react
 *       - in: query
 *         name: version
 *         required: false
 *         schema:
 *           type: string
 *         description: Specific version to check
 *         example: "18.2.0"
 *     responses:
 *       200:
 *         description: Approval status retrieved successfully
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
 *                         team:
 *                           type: string
 *                         technology:
 *                           type: string
 *                         category:
 *                           type: string
 *                         vendor:
 *                           type: string
 *                         version:
 *                           type: string
 *                         approval:
 *                           type: object
 *                           properties:
 *                             level:
 *                               type: string
 *                               enum: [version, technology, default]
 *                             time:
 *                               type: string
 *                               enum: [adopt, trial, assess, hold, eliminate]
 *                             approvedAt:
 *                               type: string
 *                             approvedBy:
 *                               type: string
 *                             notes:
 *                               type: string
 *             example:
 *               success: true
 *               data:
 *                 team: frontend-team
 *                 technology: react
 *                 category: framework
 *                 vendor: Meta
 *                 version: "18.2.0"
 *                 approval:
 *                   level: version
 *                   time: adopt
 *                   approvedAt: "2024-01-15T10:00:00Z"
 *                   approvedBy: architecture-team
 *                   notes: Approved for production use
 *       400:
 *         description: Team and technology parameters are required
 *       404:
 *         description: Team or technology not found
 */
import { TeamService } from '../services/team.service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const team = query.team as string
  const technology = query.technology as string
  const version = query.version as string | undefined
  
  if (!team || !technology) {
    throw createError({
      statusCode: 400,
      message: 'Team and technology parameters are required'
    })
  }
  
  try {
    const teamService = new TeamService()
    const result = await teamService.checkApproval(team, technology, version)
    
    return {
      success: true,
      data: result
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: `Failed to check approval status: ${error}`
    })
  }
})
