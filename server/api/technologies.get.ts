export default defineEventHandler(async () => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (t:Technology)
      OPTIONAL MATCH (team:Team)-[:OWNS]->(t)
      OPTIONAL MATCH (t)-[:HAS_VERSION]->(v:Version)
      RETURN t.name as name,
             t.category as category,
             t.vendor as vendor,
             t.status as status,
             t.approvedVersionRange as approvedVersionRange,
             t.ownerTeam as ownerTeam,
             t.riskLevel as riskLevel,
             t.lastReviewed as lastReviewed,
             team.name as ownerTeamName,
             collect(DISTINCT v.version) as versions
      ORDER BY t.category, t.name
    `)
    
    const technologies = records.map(record => ({
      name: record.get('name'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      status: record.get('status'),
      approvedVersionRange: record.get('approvedVersionRange'),
      ownerTeam: record.get('ownerTeam'),
      riskLevel: record.get('riskLevel'),
      lastReviewed: record.get('lastReviewed')?.toString(),
      ownerTeamName: record.get('ownerTeamName'),
      versions: record.get('versions').filter((v: string) => v)
    }))
    
    return {
      success: true,
      data: technologies,
      count: technologies.length
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch technologies'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
