import { componentService } from '../../services/singletons'
import { parseSearchParam } from '../../utils/query-params'

/**
 * @openapi
 * /components/dismissed-links:
 *   get:
 *     tags:
 *       - Components
 *     summary: Get components dismissed from the link-suggestions queue
 *     description: Returns components previously dismissed via /components/dismiss-link, so they can be restored to the queue. Superuser only.
 *     security:
 *       - bearerAuth: []
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
 *           default: 50
 *           maximum: 200
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive substring match on component name
 *     responses:
 *       200:
 *         description: Dismissed components returned
 *       403:
 *         description: Superuser access required
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const query = getQuery(event)
  const skip = Math.max(0, Math.floor(Number(query.skip ?? '0')) || 0)
  const limit = Math.min(200, Math.max(1, Math.floor(Number(query.limit ?? '50')) || 50))

  const result = await componentService.getDismissedLinks(skip, limit, parseSearchParam(query.search))

  return {
    success: true,
    data: result.data,
    count: result.count,
    total: result.total
  }
})
