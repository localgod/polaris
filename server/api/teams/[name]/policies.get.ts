export default defineEventHandler(async (event) => {
  try {
    const teamName = getRouterParam(event, 'name')
    
    if (!teamName) {
      throw createError({
        statusCode: 400,
        message: 'Team name is required'
      })
    }
    
    const driver = useDriver()
    
    // Get policies enforced by this team
    const { records: enforcedRecords } = await driver.executeQuery(`
      MATCH (team:Team {name: $teamName})-[:ENFORCES]->(p:Policy)
      OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
      WITH p, collect(DISTINCT tech.name) as governedTechnologies
      RETURN p.name as name,
             p.description as description,
             p.ruleType as ruleType,
             p.severity as severity,
             p.effectiveDate as effectiveDate,
             p.expiryDate as expiryDate,
             p.scope as scope,
             p.status as status,
             governedTechnologies
      ORDER BY p.effectiveDate DESC
    `, { teamName })
    
    const enforcedPolicies = enforcedRecords.map(record => ({
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      scope: record.get('scope'),
      status: record.get('status'),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t)
    }))
    
    // Get policies this team is subject to
    const { records: subjectRecords } = await driver.executeQuery(`
      MATCH (team:Team {name: $teamName})-[:SUBJECT_TO]->(p:Policy)
      OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
      OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
      WITH p, enforcer, collect(DISTINCT tech.name) as governedTechnologies
      RETURN p.name as name,
             p.description as description,
             p.ruleType as ruleType,
             p.severity as severity,
             p.effectiveDate as effectiveDate,
             p.expiryDate as expiryDate,
             p.scope as scope,
             p.status as status,
             enforcer.name as enforcedBy,
             governedTechnologies
      ORDER BY p.effectiveDate DESC
    `, { teamName })
    
    const subjectToPolicies = subjectRecords.map(record => ({
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      scope: record.get('scope'),
      status: record.get('status'),
      enforcedBy: record.get('enforcedBy'),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t)
    }))
    
    return {
      success: true,
      data: {
        team: teamName,
        enforced: enforcedPolicies,
        subjectTo: subjectToPolicies,
        enforcedCount: enforcedPolicies.length,
        subjectToCount: subjectToPolicies.length
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team policies'
    return {
      success: false,
      error: errorMessage
    }
  }
})
