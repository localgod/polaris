import { componentService } from '../../services/singletons'

/**
 * @openapi
 * /components/link-suggestions:
 *   get:
 *     tags:
 *       - Components
 *     summary: Get pending PURL-to-Technology link suggestions
 *     description: Returns unlinked, non-dismissed components with fuzzy Technology name suggestions. Superuser only.
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
 *     responses:
 *       200:
 *         description: Link suggestions returned
 *       403:
 *         description: Superuser access required
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const query = getQuery(event)
  const skip = Math.max(0, parseInt(String(query.skip ?? '0'), 10) || 0)
  const limit = Math.min(200, Math.max(1, parseInt(String(query.limit ?? '50'), 10) || 50))

  const result = await componentService.getLinkSuggestions(skip, limit)

  return {
    success: true,
    data: result.data,
    count: result.count,
    total: result.total
  }
})
