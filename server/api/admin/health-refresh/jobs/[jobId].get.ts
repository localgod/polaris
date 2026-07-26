import { healthRefreshService } from '../../../../services/singletons'

/**
 * @openapi
 * /admin/health-refresh/jobs/{jobId}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get health-refresh job status
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Health-refresh job status
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Health-refresh job not found
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const jobId = getRouterParam(event, 'jobId') || ''
  if (!jobId) {
    throw createError({ statusCode: 400, message: 'jobId is required' })
  }

  const job = await healthRefreshService.findById(jobId)
  if (!job) {
    throw createError({ statusCode: 404, message: 'Health-refresh job not found' })
  }

  return {
    success: true,
    data: job
  }
})
