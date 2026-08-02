/**
 * @openapi
 * /approvals:
 *   get:
 *     tags:
 *       - Approvals
 *     summary: Check technology approval status
 *     description: |
 *       Checks if a technology is approved for a team.
 *
 *       **Approval Hierarchy:**
 *       1. Technology-level approval - `level: "technology"`
 *       2. Default (no approval recorded) - `level: "default"`, `time: "unclassified"`
 *
 *       Both an explicit `eliminate` vote and the `unclassified` default are treated as
 *       compliance violations elsewhere in Polaris (see ADR-0005), but they are kept
 *       distinguishable here rather than collapsed into the same value.
 *
 *       **TIME Framework Values:**
 *       - `invest` - Strategic technologies receiving active investment
 *       - `tolerate` - Legacy technologies being phased out
 *       - `migrate` - Technologies being actively replaced
 *       - `eliminate` - Must be removed
 *       - `unclassified` - No team approval has been recorded (default-check only)
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
 *         name: environment
 *         required: false
 *         schema:
 *           type: string
 *           enum: [dev, test, staging, prod]
 *         description: System environment to check. Environment-specific approval takes precedence over a blanket approval for the same team.
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
 *                         type:
 *                           type: string
 *                         vendor:
 *                           type: string
 *                         approval:
 *                           type: object
 *                           properties:
 *                             level:
 *                               type: string
 *                               enum: [technology, default]
 *                             time:
 *                               type: string
 *                               enum: [tolerate, invest, migrate, eliminate, unclassified]
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
 *                 type: framework
 *                 vendor: Meta
 *                 approval:
 *                   level: technology
 *                   time: invest
 *                   approvedAt: "2024-01-15T10:00:00Z"
 *                   approvedBy: architecture-team
 *                   notes: Approved for production use
 *       400:
 *         description: Team and technology parameters are required
 *       404:
 *         description: Team or technology not found
 */
import { teamService } from '../services/singletons'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const team = query.team as string
  const technology = query.technology as string
  const environment = (query.environment as string | undefined) ?? null

  if (!team || !technology) {
    throw createError({
      statusCode: 400,
      message: 'Team and technology parameters are required'
    })
  }

  try {
    const result = await teamService.checkApproval(team, technology, environment)
    
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
