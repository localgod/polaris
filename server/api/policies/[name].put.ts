import { PolicyService } from '../../services/policy.service'

/**
 * @openapi
 * /policies/{name}:
 *   put:
 *     tags:
 *       - Policies
 *     summary: Update a policy
 *     description: |
 *       Updates a policy's properties and relationships.
 *       
 *       Authorization:
 *       - Superusers can edit any policy
 *       - Team members can edit policies scoped to their team
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               ruleType:
 *                 type: string
 *               severity:
 *                 type: string
 *               scope:
 *                 type: string
 *                 enum: [organization, team]
 *               subjectTeam:
 *                 type: string
 *               versionRange:
 *                 type: string
 *               governsTechnology:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Policy updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Policy not found
 */

interface UpdatePolicyRequest {
  description?: string
  ruleType?: string
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
    throw createError({ statusCode: 400, message: 'Policy name is required' })
  }
  const name = decodeURIComponent(rawName)

  // Load the existing policy to check authorization
  const policyService = new PolicyService()
  const existing = await policyService.findByName(name)
  if (!existing) {
    throw createError({ statusCode: 404, message: `Policy '${name}' not found` })
  }

  // Authorization: superuser can edit anything; team member can edit team-scoped policies
  if (user.role !== 'superuser') {
    if (existing.scope !== 'team' || !existing.subjectTeam) {
      throw createError({
        statusCode: 403,
        message: 'Only superusers can edit organization-scoped policies'
      })
    }
    const userTeamNames = user.teams?.map((t: { name: string }) => t.name) || []
    if (!userTeamNames.includes(existing.subjectTeam)) {
      throw createError({
        statusCode: 403,
        message: `You must be a member of team "${existing.subjectTeam}" to edit this policy`
      })
    }
  }

  let body: UpdatePolicyRequest
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON in request body' })
  }

  // If a non-superuser tries to change scope to organization, block it
  if (user.role !== 'superuser' && body.scope === 'organization') {
    throw createError({
      statusCode: 403,
      message: 'Only superusers can set organization scope'
    })
  }

  const policy = await policyService.update(name, {
    description: body.description,
    ruleType: body.ruleType,
    severity: body.severity,
    scope: body.scope,
    subjectTeam: body.subjectTeam,
    versionRange: body.versionRange,
    governsTechnology: body.governsTechnology,
    status: body.status,
    userId: user.id
  })

  return {
    success: true,
    message: 'Policy updated successfully',
    policy
  }
})
