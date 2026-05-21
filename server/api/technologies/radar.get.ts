import type { ApiResponse } from '~~/types/api'
import type { RadarTechnology } from '../../services/technology.service'
import { technologyService } from '../../services/singletons'

/**
 * @openapi
 * /technologies/radar:
 *   get:
 *     tags:
 *       - Technologies
 *     summary: Get technologies shaped for the radar visualization
 *     description: >
 *       Returns all technologies with a resolved TIME value for the radar view.
 *       When `team` is provided each technology is placed in the ring matching
 *       that team's TIME approval. Without `team` the dominant TIME value across
 *       all approvals is used (majority vote; ties broken by severity).
 *       Technologies with no applicable approval are marked 'unclassified'.
 *     parameters:
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter TIME values by this team name
 *     responses:
 *       200:
 *         description: Successfully retrieved radar data
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
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                             nullable: true
 *                           domain:
 *                             type: string
 *                             nullable: true
 *                           timeValue:
 *                             type: string
 *                             enum: [invest, tolerate, migrate, eliminate, unclassified]
 *                           approvalCount:
 *                             type: integer
 *       500:
 *         description: Failed to fetch radar data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<RadarTechnology>> => {
  try {
    const query = getQuery(event)
    const team = typeof query.team === 'string' ? query.team.trim() || undefined : undefined

    const data = await technologyService.findForRadar(team)

    return { success: true, data, count: data.length }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch radar data'
    return { success: false, error: message, data: [] }
  }
})
