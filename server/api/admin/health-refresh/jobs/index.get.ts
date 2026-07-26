import { healthRefreshService } from '../../../../services/singletons'
import { parseSearchParam } from '../../../../utils/query-params'
import type { HealthRefreshJobStatus } from '../../../../repositories/health-refresh.repository'

const VALID_STATUSES: HealthRefreshJobStatus[] = ['queued', 'running', 'completed', 'failed', 'cancelled']

/**
 * @openapi
 * /admin/health-refresh/jobs:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List health-refresh jobs
 *     description: Paginated, filterable listing of all health-refresh jobs for the admin monitoring view. Superuser only.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated list of statuses to include (queued, running, completed, failed, cancelled)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive substring match on system name
 *     responses:
 *       200:
 *         description: Health-refresh jobs retrieved successfully
 *       403:
 *         description: Superuser access required
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const query = getQuery(event)
  const skip = Math.max(0, Math.floor(Number(query.skip ?? '0')) || 0)
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit ?? '20')) || 20))
  const statusParam = typeof query.status === 'string' ? query.status : ''
  const statuses = statusParam
    .split(',')
    .map(s => s.trim())
    .filter((s): s is HealthRefreshJobStatus => VALID_STATUSES.includes(s as HealthRefreshJobStatus))

  const result = await healthRefreshService.findAll({
    skip,
    limit,
    statuses: statuses.length > 0 ? statuses : undefined,
    search: parseSearchParam(query.search)
  })

  return {
    success: true,
    data: result.jobs,
    count: result.jobs.length,
    total: result.total
  }
})
