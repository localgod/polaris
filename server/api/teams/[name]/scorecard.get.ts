import { scorecardService } from '../../../services/singletons'
import { sendSuccess, sendNotFound } from '../../../utils/response'

/**
 * @openapi
 * /api/teams/{name}/scorecard:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Get the compliance scorecard for a team
 *     description: |
 *       Computes an on-demand governance scorecard from existing compliance data:
 *       SBOM freshness across owned systems, Eliminate-marked technologies in use,
 *       disallowed-license usage, critical version constraint violations, and TIME
 *       classification coverage of used technologies.
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Team name
 *     responses:
 *       200:
 *         description: Scorecard computed
 *       400:
 *         description: Team name is required
 *       404:
 *         description: Team not found
 */
export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Team name is required' })
  }

  const name = decodeURIComponent(rawName)
  const scorecard = await scorecardService.getTeamScorecard(name)

  if (scorecard === null) sendNotFound('Team', name)

  return sendSuccess(event, scorecard!)
})
