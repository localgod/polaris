import { systemService } from '../../../services/singletons'
import { sendSuccess, sendNotFound } from '../../../utils/response'

/**
 * @openapi
 * /api/systems/{name}/issues:
 *   get:
 *     tags:
 *       - Systems
 *     summary: Get active issues for a system
 *     description: |
 *       Returns components in the system that have known vulnerabilities,
 *       disallowed licenses, or health problems (EOL, deprecated, stale maintenance).
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     responses:
 *       200:
 *         description: Issue lists returned
 *       404:
 *         description: System not found
 */
export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({ statusCode: 400, message: 'System name is required' })
  }

  const name = decodeURIComponent(rawName)
  const result = await systemService.getIssues(name)

  if (result === null) sendNotFound('System', name)

  return sendSuccess(event, result!)
})
