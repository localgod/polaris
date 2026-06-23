import { healthRefreshService } from '../../../services/singletons'

export default defineEventHandler(async (event) => {
  await requireAuthorization(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({ statusCode: 400, message: 'System name is required' })
  }

  const name = decodeURIComponent(rawName)

  const jobId = await healthRefreshService.enqueueForSystem(name)

  return { success: true, data: { jobId } }
})
