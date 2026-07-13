import type { ApiResponse, VersionSprawlDetection } from '~~/types/api'
import { versionSprawlService } from '../../services/singletons'
import { cachedFetch } from '../../utils/cache'

/**
 * @openapi
 * /version-sprawl:
 *   get:
 *     tags:
 *       - Components
 *     summary: List detected version sprawl
 *     description: Detects technologies with 2+ distinct versions in use as direct dependencies across systems, scored and ranked by sprawl severity (version count, affected system count, major-version spread, and EOL exposure). Transitive-only versions are excluded since a team cannot act on a version it doesn't declare itself.
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [high, medium, low]
 *         description: Filter to a single severity tier
 *     responses:
 *       200:
 *         description: Successfully retrieved version sprawl detections
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
 *                         $ref: '#/components/schemas/VersionSprawlDetection'
 *       500:
 *         description: Failed to detect version sprawl
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<VersionSprawlDetection>> => {
  try {
    const query = getQuery(event)
    const severity = ['high', 'medium', 'low'].includes(query.severity as string)
      ? query.severity as string
      : undefined

    const detections = await cachedFetch(
      'version-sprawl:v1:detections',
      () => versionSprawlService.detect(),
      300
    )

    const data = severity
      ? detections.filter(detection => detection.severity === severity)
      : detections

    return { success: true, data, count: data.length }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to detect version sprawl'
    setResponseStatus(event, 500)
    return { success: false, error: errorMessage, data: [] }
  }
})
