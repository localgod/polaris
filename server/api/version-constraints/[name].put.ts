import { VersionConstraintService } from '../../services/version-constraint.service'

interface UpdateRequest {
  description?: string
  severity?: string
  scope?: string
  subjectTeam?: string | null
  versionRange?: string | null
  governsTechnology?: string | null
  status?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }
  const name = decodeURIComponent(rawName)

  const service = new VersionConstraintService()
  const existing = await service.findByName(name)
  if (!existing) {
    throw createError({ statusCode: 404, message: `Version constraint '${name}' not found` })
  }

  // Authorization: superuser can edit anything; team member can edit team-scoped constraints
  if (user.role !== 'superuser') {
    if (existing.scope !== 'team' || !existing.subjectTeam) {
      throw createError({ statusCode: 403, message: 'Only superusers can edit organization-scoped version constraints' })
    }
    const userTeamNames = user.teams?.map((t: { name: string }) => t.name) || []
    if (!userTeamNames.includes(existing.subjectTeam)) {
      throw createError({ statusCode: 403, message: `You must be a member of team "${existing.subjectTeam}" to edit this version constraint` })
    }
  }

  let body: UpdateRequest
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON in request body' })
  }

  if (user.role !== 'superuser' && body.scope === 'organization') {
    throw createError({ statusCode: 403, message: 'Only superusers can set organization scope' })
  }

  const constraint = await service.update(name, {
    description: body.description,
    severity: body.severity,
    scope: body.scope,
    subjectTeam: body.subjectTeam,
    versionRange: body.versionRange,
    governsTechnology: body.governsTechnology,
    status: body.status,
    userId: user.id
  })

  return { success: true, message: 'Version constraint updated successfully', constraint }
})
