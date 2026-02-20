import { VersionConstraintService } from '../../services/version-constraint.service'

export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const name = decodeURIComponent(rawName)
  const service = new VersionConstraintService()
  const constraint = await service.findByName(name)

  if (!constraint) {
    throw createError({ statusCode: 404, message: `Version constraint '${name}' not found` })
  }

  return { success: true, data: constraint }
})
