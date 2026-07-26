import { gitHubOrgImportService } from '../../../../services/singletons'
import { parseSearchParam } from '../../../../utils/query-params'
import type { ImportJobStatus } from '../../../../repositories/import-job.repository'

const VALID_STATUSES: ImportJobStatus[] = ['queued', 'running', 'completed', 'failed', 'cancelled']

/**
 * @openapi
 * /admin/import/jobs:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List GitHub import jobs
 *     description: Paginated, filterable listing of all import jobs for the admin monitoring view. Superuser only.
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
 *         description: Case-insensitive substring match on organization
 *     responses:
 *       200:
 *         description: Import jobs retrieved successfully
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
    .filter((s): s is ImportJobStatus => VALID_STATUSES.includes(s as ImportJobStatus))

  const result = await gitHubOrgImportService.findAll({
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
