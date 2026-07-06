import { scorecardService } from '../../../services/singletons'
import { sendSuccess, sendNotFound } from '../../../utils/response'

/**
 * @openapi
 * /api/systems/{name}/scorecard:
 *   get:
 *     tags:
 *       - Systems
 *     summary: Get the compliance scorecard for a system
 *     description: |
 *       Computes an on-demand governance scorecard from existing compliance data:
 *       SBOM freshness, Eliminate-marked technologies in use, disallowed-license
 *       usage, critical version constraint violations, and TIME classification
 *       coverage of used technologies.
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     responses:
 *       200:
 *         description: Scorecard computed
 *       400:
 *         description: System name is required
 *       404:
 *         description: System not found
 */
export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({ statusCode: 400, message: 'System name is required' })
  }

  const name = decodeURIComponent(rawName)
  const scorecard = await scorecardService.getSystemScorecard(name)

  if (scorecard === null) sendNotFound('System', name)

  return sendSuccess(event, scorecard!)
})
