import { healthRefreshService } from '../../../../../services/singletons'
import { auditFailedOperation } from '../../../../../utils/audit'

/**
 * @openapi
 * /admin/health-refresh/jobs/{jobId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a health-refresh job
 *     description: |
 *       Permanently removes a finished health-refresh job and its items.
 *       Queued/running jobs must be cancelled first. Superuser only.
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
 *         description: Health-refresh job deleted
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Health-refresh job not found
 *       409:
 *         description: Job is still queued/running and must be cancelled first
 */
export default defineEventHandler(async (event) => {
  const user = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const jobId = getRouterParam(event, 'jobId') || ''
  if (!jobId) {
    throw createError({ statusCode: 400, message: 'jobId is required' })
  }

  try {
    await healthRefreshService.remove(jobId, { userId: user.id, realUserId })
    return { success: true, message: 'Health-refresh job deleted' }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'DELETE_HEALTH_REFRESH_JOB',
      entityType: 'HealthRefreshJob',
      entityId: jobId,
      reason: error instanceof Error ? error.message : 'Failed to delete health-refresh job',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
