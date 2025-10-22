export default defineEventHandler(async () => {
  const driver = useDriver()
  
  try {
    const { records } = await driver.executeQuery(`
      // Find teams using technologies without approval or with eliminate status
      MATCH (team:Team)-[u:USES]->(tech:Technology)
      OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
      WHERE a IS NULL OR a.time = 'eliminate'
      WITH team, tech, u, a,
           [(team)-[:OWNS]->(sys:System)-[:USES]->(:Component)-[:IS_VERSION_OF]->(tech) | sys.name] as systems
      RETURN 
        team.name as team,
        tech.name as technology,
        tech.category as category,
        u.systemCount as systemCount,
        systems,
        CASE 
          WHEN a IS NULL THEN 'unapproved'
          WHEN a.time = 'eliminate' THEN 'eliminated'
          ELSE 'unknown'
        END as violationType,
        a.notes as notes,
        a.migrationTarget as migrationTarget
      ORDER BY u.systemCount DESC, team.name, tech.name
    `)
    
    const violations = records.map(record => ({
      team: record.get('team'),
      technology: record.get('technology'),
      category: record.get('category'),
      systemCount: record.get('systemCount')?.toNumber() || 0,
      systems: record.get('systems'),
      violationType: record.get('violationType'),
      notes: record.get('notes'),
      migrationTarget: record.get('migrationTarget')
    }))
    
    // Group by team for summary
    const byTeam = violations.reduce((acc, v) => {
      if (!acc[v.team]) {
        acc[v.team] = []
      }
      acc[v.team].push(v)
      return acc
    }, {} as Record<string, typeof violations>)
    
    return {
      success: true,
      data: {
        violations,
        summary: {
          totalViolations: violations.length,
          teamsAffected: Object.keys(byTeam).length,
          byTeam: Object.entries(byTeam).map(([team, viols]) => ({
            team,
            violationCount: viols.length,
            systemsAffected: viols.reduce((sum, v) => sum + v.systemCount, 0)
          }))
        }
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch compliance violations: ${error}`
    })
  }
})
