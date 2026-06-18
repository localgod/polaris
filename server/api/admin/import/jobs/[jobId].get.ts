import { gitHubOrgImportService } from '../../../../services/singletons'

/**
 * @openapi
 * /admin/import/jobs/{jobId}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get import job status
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
 *         description: Import job status
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Import job not found
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const jobId = getRouterParam(event, 'jobId') || ''
  if (!jobId) {
    throw createError({ statusCode: 400, message: 'jobId is required' })
  }

  const job = await gitHubOrgImportService.findById(jobId)
  if (!job) {
    throw createError({ statusCode: 404, message: 'Import job not found' })
  }

  return {
    success: true,
    data: job
  }
})
