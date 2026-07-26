import { healthRefreshService } from '../../../../../services/singletons'
import { auditFailedOperation } from '../../../../../utils/audit'

/**
 * @openapi
 * /admin/health-refresh/jobs/{jobId}/cancel:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Cancel a health-refresh job
 *     description: |
 *       Cancels a queued or running health-refresh job. Any not-yet-finished
 *       items are marked skipped. Superuser only.
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
 *         description: Health-refresh job cancelled
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Health-refresh job not found
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
    const job = await healthRefreshService.cancel(jobId, { userId: user.id, realUserId })
    return { success: true, data: job }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'CANCEL_HEALTH_REFRESH_JOB',
      entityType: 'HealthRefreshJob',
      entityId: jobId,
      reason: error instanceof Error ? error.message : 'Failed to cancel health-refresh job',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
