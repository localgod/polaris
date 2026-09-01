/**
 * @openapi
 * /technologies/{name}/policy:
 *   get:
 *     tags:
 *       - Technologies
 *     summary: Get the active organization TIME policy for a technology
 *     description: Returns the single active TechnologyPolicy for the given technology, including any unrevoked, unexpired exceptions.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *     responses:
 *       200:
 *         description: Active policy (null data if no active policy exists)
 *       404:
 *         description: Technology not found
 */
import { policyService } from '../../../services/singletons'
import { sendSuccess } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) throw createError({ statusCode: 400, message: 'Technology name is required' })
  const technologyName = decodeURIComponent(rawName)

  const policy = await policyService.getActive(technologyName)
  return sendSuccess(event, policy)
})
