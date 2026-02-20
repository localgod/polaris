import { VersionConstraintService } from '../../services/version-constraint.service'
import { VersionConstraintRepository } from '../../repositories/version-constraint.repository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const name = decodeURIComponent(rawName)

  if (user.role !== 'superuser') {
    const repo = new VersionConstraintRepository()
    const creator = await repo.getCreator(name)
    if (creator !== user.id) {
      throw createError({ statusCode: 403, message: 'Only superusers or the creator can delete this version constraint' })
    }
  }

  const service = new VersionConstraintService()
  await service.delete(name, user.id)

  setResponseStatus(event, 204)
  return null
})
