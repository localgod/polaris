export default defineEventHandler(async (event) => {
  // Require authorization (authenticated + team membership)
  await requireAuthorization(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  
  // Validate that user's team owns this system
  await validateTeamOwnership(event, 'System', name)
  
  const driver = useDriver()
  
  // Check if system exists
  const { records: checkRecords } = await driver.executeQuery(`
    MATCH (s:System {name: $name})
    RETURN s
  `, { name })
  
  if (checkRecords.length === 0) {
    throw createError({
      statusCode: 404,
      message: `System '${name}' not found`
    })
  }
  
  // Delete system and all its relationships
  await driver.executeQuery(`
    MATCH (s:System {name: $name})
    DETACH DELETE s
  `, { name })
  
  setResponseStatus(event, 204)
  return null
})
