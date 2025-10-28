/**
 * Update a system
 * Requires: User must be authenticated and belong to the team that owns the system
 */
export default defineEventHandler(async (event) => {
  // Get system name from route params
  const systemName = getRouterParam(event, 'name')
  
  if (!systemName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'System name is required'
    })
  }

  // Require authorization (authenticated + team membership)
  await requireAuthorization(event)
  
  // Validate that user's team owns this system
  await validateTeamOwnership(event, 'System', systemName)
  
  // Get update data from request body
  const body = await readBody(event)
  
  // Validate required fields
  if (!body.description && !body.businessCriticality && !body.environment) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'At least one field to update is required'
    })
  }

  const driver = useDriver()
  const session = driver.session()

  try {
    // Build dynamic SET clause based on provided fields
    const updates: string[] = []
    const params: Record<string, string> = { name: systemName }

    if (body.description !== undefined) {
      updates.push('s.description = $description')
      params.description = body.description
    }
    if (body.businessCriticality !== undefined) {
      updates.push('s.businessCriticality = $businessCriticality')
      params.businessCriticality = body.businessCriticality
    }
    if (body.environment !== undefined) {
      updates.push('s.environment = $environment')
      params.environment = body.environment
    }

    const query = `
      MATCH (s:System {name: $name})
      SET ${updates.join(', ')}
      RETURN s {
        .*,
        ownerTeam: [(s)<-[:OWNS]-(t:Team) | t.name][0]
      } as system
    `

    const result = await session.run(query, params)

    const record = getFirstRecordOrThrow(result.records, 'System not found')

    return {
      success: true,
      data: record.get('system')
    }
  } finally {
    await session.close()
  }
})
