export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  const driver = useDriver()
  
  const { records } = await driver.executeQuery(`
    MATCH (s:System {name: $name})
    OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
    OPTIONAL MATCH (s)-[:USES]->(c:Component)
    OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
    RETURN s {
      .*,
      ownerTeam: team.name,
      componentCount: count(DISTINCT c),
      repositoryCount: count(DISTINCT r)
    } as system
  `, { name })
  
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
