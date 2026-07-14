import { versionConstraintService } from '../../services/singletons'
import { VersionConstraintRepository } from '../../repositories/version-constraint.repository'
import { auditFailedOperation } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const name = decodeURIComponent(rawName)

  try {
    if (user.role !== 'superuser') {
      const repo = new VersionConstraintRepository()
      const creator = await repo.getCreator(name)
      if (creator !== user.id) {
        throw createError({ statusCode: 403, message: 'Only superusers or the creator can delete this version constraint' })
      }
    }

    await versionConstraintService.delete(name, user.id, realUserId)

    setResponseStatus(event, 204)
    return null
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'DELETE',
      entityType: 'VersionConstraint',
      entityId: name,
      reason: error instanceof Error ? error.message : 'Failed to delete version constraint',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
