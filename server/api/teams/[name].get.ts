export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Team name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  const driver = useDriver()
  
  const { records } = await driver.executeQuery(`
    MATCH (t:Team {name: $name})
    OPTIONAL MATCH (t)-[:STEWARDED_BY]->(tech:Technology)
    OPTIONAL MATCH (t)-[:OWNS]->(sys:System)
    OPTIONAL MATCH (t)-[:USES]->(usedTech:Technology)
    OPTIONAL MATCH (u:User)-[:MEMBER_OF]->(t)
    RETURN t {
      .*,
      technologyCount: count(DISTINCT tech),
      systemCount: count(DISTINCT sys),
      usedTechnologyCount: count(DISTINCT usedTech),
      memberCount: count(DISTINCT u)
    } as team
  `, { name })
  
  if (records.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Team '${name}' not found`
    })
  }
  
  return {
    success: true,
    data: records[0].get('team')
  }
})
