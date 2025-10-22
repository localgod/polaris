export default defineEventHandler(async (event) => {
  try {
    const rawName = getRouterParam(event, 'name')
    
    if (!rawName) {
      throw createError({
        statusCode: 400,
        message: 'Policy name is required'
      })
    }
    
    const name = decodeURIComponent(rawName)
    
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (p:Policy {name: $name})
      OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
      OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(p)
      OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
      OPTIONAL MATCH (p)-[:GOVERNS]->(v:Version)
      WITH p, enforcer,
           collect(DISTINCT subject.name) as subjectTeams,
           collect(DISTINCT tech.name) as governedTechnologies,
           collect(DISTINCT {technology: v.technologyName, version: v.version}) as governedVersions
      RETURN p.name as name,
             p.description as description,
             p.ruleType as ruleType,
             p.severity as severity,
             p.effectiveDate as effectiveDate,
             p.expiryDate as expiryDate,
             p.enforcedBy as enforcedBy,
             p.scope as scope,
             p.status as status,
             enforcer.name as enforcerTeam,
             subjectTeams,
             governedTechnologies,
             governedVersions
    `, { name })
    
    if (records.length === 0) {
      throw createError({
        statusCode: 404,
        message: `Policy '${name}' not found`
      })
    }
    
    const record = records[0]
    const policy = {
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      enforcedBy: record.get('enforcedBy'),
      scope: record.get('scope'),
      status: record.get('status'),
      enforcerTeam: record.get('enforcerTeam'),
      subjectTeams: record.get('subjectTeams').filter((t: string) => t),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t),
      governedVersions: record.get('governedVersions').filter((v: { technology: string }) => v.technology)
    }
    
    return {
      success: true,
      data: policy
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policy'
    return {
      success: false,
      error: errorMessage
    }
  }
})
