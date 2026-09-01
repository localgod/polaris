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
 *       Returns all technologies with the TIME value resolved from the active
 *       organization TechnologyPolicy. Technologies with no active policy are
 *       marked 'unclassified'.
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
 *                           policyId:
 *                             type: string
 *                             nullable: true
 *       500:
 *         description: Failed to fetch radar data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (_event): Promise<ApiResponse<RadarTechnology>> => {
  try {
    const data = await technologyService.findForRadar()

    return { success: true, data, count: data.length }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch radar data'
    return { success: false, error: message, data: [] }
  }
})
