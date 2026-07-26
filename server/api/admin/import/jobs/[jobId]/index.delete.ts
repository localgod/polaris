import { gitHubOrgImportService } from '../../../../../services/singletons'
import { auditFailedOperation } from '../../../../../utils/audit'

/**
 * @openapi
 * /admin/import/jobs/{jobId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a GitHub import job
 *     description: |
 *       Permanently removes a finished import job and its repository items.
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
 *         description: Import job deleted
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Import job not found
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
    await gitHubOrgImportService.remove(jobId, { userId: user.id, realUserId })
    return { success: true, message: 'Import job deleted' }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'DELETE_IMPORT_JOB',
      entityType: 'ImportJob',
      entityId: jobId,
      reason: error instanceof Error ? error.message : 'Failed to delete import job',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
