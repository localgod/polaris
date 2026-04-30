import { versionConstraintService } from '../../services/singletons'

export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const name = decodeURIComponent(rawName)
  const constraint = await versionConstraintService.findByName(name)

  if (!constraint) {
    throw createError({ statusCode: 404, message: `Version constraint '${name}' not found` })
  }

  return { success: true, data: constraint }
})
