import { technologyService } from '../../../services/singletons'
import { sendSuccess, sendNotFound, sendBadRequest } from '../../../utils/response'

/**
 * @openapi
 * /technologies/{name}/graph:
 *   get:
 *     tags:
 *       - Technologies
 *     summary: Get impact/blast-radius graph data for a technology
 *     description: |
 *       Returns every system using this technology, that system's owning
 *       team, and the owning team's own TIME approval for the technology
 *       (never an unrelated approving team's). Used to answer "what's the
 *       blast radius if we eliminate this technology?"
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *         example: React
 *     responses:
 *       200:
 *         description: Graph data returned
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         technology:
 *                           type: string
 *                         systems:
 *                           type: array
 *                           items:
 *                             type: object
 *       400:
 *         description: Technology name is required
 *       404:
 *         description: Technology not found
 */
export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  if (!rawName) return sendBadRequest('Technology name is required')

  const name = decodeURIComponent(rawName)
  const systems = await technologyService.getGraph(name)

  if (systems === null) return sendNotFound('Technology', name)

  return sendSuccess(event, { technology: name, systems })
})
