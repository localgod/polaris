import { healthRefreshService } from '../../services/singletons'

/**
 * @openapi
 * /health/summary:
 *   get:
 *     tags:
 *       - Health
 *     summary: Get cross-system component health summary
 *     description: Returns dashboard-ready health, advisory, freshness, and critical-system risk aggregates.
 *     responses:
 *       200:
 *         description: Health summary retrieved successfully
 */
export default defineEventHandler(async () => {
  const data = await healthRefreshService.getDashboardSummary()
  return {
    success: true,
    data,
    count: 1
  }
})
