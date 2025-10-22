export default defineEventHandler(async (event) => {
  const teamName = getRouterParam(event, 'name')
  
  if (!teamName) {
    throw createError({
      statusCode: 400,
      message: 'Team name is required'
    })
  }
  
  const driver = useDriver()
  
  try {
    const { records } = await driver.executeQuery(`
      MATCH (team:Team {name: $teamName})-[u:USES]->(tech:Technology)
      OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
      RETURN 
        tech.name as technology,
        tech.category as category,
        tech.vendor as vendor,
        u.systemCount as systemCount,
        u.firstUsed as firstUsed,
        u.lastVerified as lastVerified,
        a.time as approvalStatus,
        CASE 
          WHEN a IS NULL THEN 'unapproved'
          WHEN a.time IN ['invest', 'tolerate'] THEN 'compliant'
          WHEN a.time = 'migrate' THEN 'migration-needed'
          WHEN a.time = 'eliminate' THEN 'violation'
          ELSE 'unknown'
        END as complianceStatus
      ORDER BY u.systemCount DESC, tech.name
    `, { teamName })
    
    const usage = records.map(record => ({
      technology: record.get('technology'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      systemCount: record.get('systemCount')?.toNumber() || 0,
      firstUsed: record.get('firstUsed')?.toString() || null,
      lastVerified: record.get('lastVerified')?.toString() || null,
      approvalStatus: record.get('approvalStatus') || null,
      complianceStatus: record.get('complianceStatus')
    }))
    
    return {
      success: true,
      data: {
        team: teamName,
        usage,
        summary: {
          totalTechnologies: usage.length,
          compliant: usage.filter(u => u.complianceStatus === 'compliant').length,
          unapproved: usage.filter(u => u.complianceStatus === 'unapproved').length,
          violations: usage.filter(u => u.complianceStatus === 'violation').length,
          migrationNeeded: usage.filter(u => u.complianceStatus === 'migration-needed').length
        }
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch team usage: ${error}`
    })
  }
})
