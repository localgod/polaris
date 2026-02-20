import { VersionConstraintService } from '../../services/version-constraint.service'
import { VersionConstraintRepository } from '../../repositories/version-constraint.repository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    setResponseStatus(event, 400)
    return { success: false, error: 'validation_error', message: 'Name is required' }
  }

  const name = decodeURIComponent(rawName)

  if (user.role !== 'superuser') {
    const repo = new VersionConstraintRepository()
    const creator = await repo.getCreator(name)
    if (creator !== user.id) {
      throw createError({ statusCode: 403, message: 'Only superusers or the creator can update this version constraint' })
    }
  }

  let body: { status?: 'active' | 'draft' | 'archived'; reason?: string }
  try {
    body = await readBody(event)
  } catch {
    setResponseStatus(event, 400)
    return { success: false, error: 'invalid_request', message: 'Invalid JSON in request body' }
  }

  if (body.status) {
    const validStatuses = ['active', 'draft', 'archived']
    if (!validStatuses.includes(body.status)) {
      setResponseStatus(event, 400)
      return { success: false, error: 'validation_error', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
    }
  }

  const service = new VersionConstraintService()

  try {
    const result = await service.updateStatus(name, { status: body.status, reason: body.reason }, user.id)
    return {
      success: true,
      message: `Version constraint ${body.status === 'active' ? 'enabled' : 'disabled'} successfully`,
      constraint: result.constraint
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const httpError = error as { statusCode: number; message: string }
      setResponseStatus(event, httpError.statusCode)
      return { success: false, error: httpError.statusCode === 404 ? 'not_found' : 'validation_error', message: httpError.message }
    }
    setResponseStatus(event, 500)
    return { success: false, error: 'internal_error', message: error instanceof Error ? error.message : 'Internal server error' }
  }
})
