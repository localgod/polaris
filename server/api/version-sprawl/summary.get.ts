import type { VersionSprawlSummary } from '~~/types/api'
import { versionSprawlService } from '../../services/singletons'
import { cachedFetch } from '../../utils/cache'

/**
 * @openapi
 * /version-sprawl/summary:
 *   get:
 *     tags:
 *       - Components
 *     summary: Get version sprawl counts by severity
 *     description: Returns counts of detected version sprawl groups by severity tier, for dashboard summary widgets.
 *     responses:
 *       200:
 *         description: Version sprawl summary retrieved successfully
 */
export default defineEventHandler(async () => {
  const data = await cachedFetch<VersionSprawlSummary>(
    'version-sprawl:v1:summary',
    () => versionSprawlService.getSummary(),
    300
  )

  return { success: true, data, count: 1 }
})
