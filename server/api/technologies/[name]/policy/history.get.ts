/**
 * @openapi
 * /technologies/{name}/policy/history:
 *   get:
 *     tags:
 *       - Technologies
 *     summary: Get full TIME policy history for a technology
 *     description: Returns all TechnologyPolicy records (draft, active, archived) ordered newest first.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *     responses:
 *       200:
 *         description: Policy history list
 */
import { policyService } from '../../../../services/singletons'
import { sendSuccess } from '../../../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) throw createError({ statusCode: 400, message: 'Technology name is required' })
  const technologyName = decodeURIComponent(rawName)

  const history = await policyService.getHistory(technologyName)
  return sendSuccess(event, history)
})
