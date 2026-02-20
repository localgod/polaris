import { VersionConstraintService } from '../services/version-constraint.service'

interface CreateRequest {
  name: string
  description?: string
  severity: string
  scope?: string
  subjectTeam?: string
  versionRange: string
  governsTechnology?: string
  status?: string
}

export default defineEventHandler(async (event) => {
  let user
  try {
    user = await requireAuth(event)
  } catch {
    setResponseStatus(event, 401)
    return { success: false, error: 'unauthenticated', message: 'Authentication required' }
  }

  let body: CreateRequest
  try {
    body = await readBody(event)
  } catch {
    setResponseStatus(event, 400)
    return { success: false, error: 'invalid_request', message: 'Invalid JSON in request body' }
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    setResponseStatus(event, 400)
    return { success: false, error: 'validation_error', message: 'name is required' }
  }

  if (!body.severity || typeof body.severity !== 'string') {
    setResponseStatus(event, 400)
    return { success: false, error: 'validation_error', message: 'severity is required' }
  }

  if (!body.versionRange || typeof body.versionRange !== 'string') {
    setResponseStatus(event, 400)
    return { success: false, error: 'validation_error', message: 'versionRange is required' }
  }

  const service = new VersionConstraintService()

  try {
    const result = await service.create({
      name: body.name.trim(),
      description: body.description,
      severity: body.severity,
      scope: body.scope,
      subjectTeam: body.subjectTeam,
      versionRange: body.versionRange,
      governsTechnology: body.governsTechnology,
      status: body.status,
      userId: user.id
    })

    setResponseStatus(event, 201)
    return {
      success: true,
      message: 'Version constraint created successfully',
      constraint: {
        name: result.constraint.name,
        description: result.constraint.description,
        severity: result.constraint.severity,
        scope: result.constraint.scope,
        status: result.constraint.status
      },
      relationshipsCreated: result.relationshipsCreated
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const httpError = error as { statusCode: number; message: string }
      setResponseStatus(event, httpError.statusCode)
      return {
        success: false,
        error: httpError.statusCode === 409 ? 'conflict' : 'validation_error',
        message: httpError.message
      }
    }

    console.error('Version constraint creation error:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'internal_error', message: error instanceof Error ? error.message : 'Internal server error' }
  }
})
