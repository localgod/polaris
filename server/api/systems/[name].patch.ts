/**
 * Partially update a system
 * Requires: User must be authenticated and belong to the team that owns the system
 */
export default defineEventHandler(async (event) => {
  await requireAuthorization(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  
  await validateTeamOwnership(event, 'System', name)
  
  const body = await readBody(event)
  
  // Validate that at least one field is provided
  if (!body.description && !body.businessCriticality && !body.environment && !body.domain) {
    throw createError({
      statusCode: 422,
      message: 'At least one field to update is required'
    })
  }
  
  // Validate businessCriticality if provided
  if (body.businessCriticality) {
    const validCriticalities = ['critical', 'high', 'medium', 'low']
    if (!validCriticalities.includes(body.businessCriticality)) {
      throw createError({
        statusCode: 422,
        message: 'Invalid business criticality value. Must be one of: critical, high, medium, low'
      })
    }
  }
  
  // Validate environment if provided
  if (body.environment) {
    const validEnvironments = ['dev', 'test', 'staging', 'prod']
    if (!validEnvironments.includes(body.environment)) {
      throw createError({
        statusCode: 422,
        message: 'Invalid environment value. Must be one of: dev, test, staging, prod'
      })
    }
  }

  const driver = useDriver()
  
  // Build dynamic SET clause based on provided fields
  const updates: string[] = []
  const params: Record<string, string> = { name }

  if (body.description !== undefined) {
    updates.push('s.description = $description')
    params.description = body.description
  }
  if (body.domain !== undefined) {
    updates.push('s.domain = $domain')
    params.domain = body.domain
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

  const { records } = await driver.executeQuery(query, params)

  if (records.length === 0) {
    throw createError({
      statusCode: 404,
      message: `System '${name}' not found`
    })
  }

  return {
    success: true,
    data: records[0].get('system')
  }
})
