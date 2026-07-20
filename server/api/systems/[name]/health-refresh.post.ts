import { healthRefreshService } from '../../../services/singletons'
import { auditFailedOperation } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requireAuthorization(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({ statusCode: 400, message: 'System name is required' })
  }

  const name = decodeURIComponent(rawName)

  try {
    const jobId = await healthRefreshService.enqueueForSystem(name, event.context.correlationId)

    return { success: true, data: { jobId } }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'HEALTH_REFRESH',
      entityType: 'System',
      entityId: name,
      reason: error instanceof Error ? error.message : 'Failed to enqueue health refresh',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
