import { gitHubOrgImportService } from '../../../../../services/singletons'
import { auditFailedOperation } from '../../../../../utils/audit'

/**
 * @openapi
 * /admin/import/jobs/{jobId}/cancel:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Cancel a GitHub import job
 *     description: |
 *       Cancels a queued or running import job. Any not-yet-finished repositories
 *       are marked skipped. Superuser only.
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
 *         description: Import job cancelled
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Import job not found
 *       409:
 *         description: Job is already finished and cannot be cancelled
 */
export default defineEventHandler(async (event) => {
  const user = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const jobId = getRouterParam(event, 'jobId') || ''
  if (!jobId) {
    throw createError({ statusCode: 400, message: 'jobId is required' })
  }

  try {
    const job = await gitHubOrgImportService.cancel(jobId, { userId: user.id, realUserId })
    return { success: true, data: job }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'CANCEL_IMPORT_JOB',
      entityType: 'ImportJob',
      entityId: jobId,
      reason: error instanceof Error ? error.message : 'Failed to cancel import job',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
