export default defineEventHandler(async (event) => {
  // Require superuser access for deleting policies
  await requireSuperuser(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Policy name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  const driver = useDriver()
  
  // Check if policy exists
  const { records: checkRecords } = await driver.executeQuery(`
    MATCH (p:Policy {name: $name})
    RETURN p
  `, { name })
  
  if (checkRecords.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Policy '${name}' not found`
    })
  }
  
  // Delete policy and all its relationships
  await driver.executeQuery(`
    MATCH (p:Policy {name: $name})
    DETACH DELETE p
  `, { name })
  
  setResponseStatus(event, 204)
  return null
})
