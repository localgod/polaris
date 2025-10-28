import type { ApiResponse, Policy } from '~~/types/api'

export default defineEventHandler(async (event): Promise<ApiResponse<Policy>> => {
  try {
    const query = getQuery(event)
    const scope = query.scope as string | undefined
    const status = query.status as string | undefined
    const enforcedBy = query.enforcedBy as string | undefined
    
    const driver = useDriver()
    
    let cypher = `
      MATCH (p:Policy)
    `
    
    const conditions: string[] = []
    const params: Record<string, string> = {}
    
    if (scope) {
      conditions.push('p.scope = $scope')
      params.scope = scope
    }
    
    if (status) {
      conditions.push('p.status = $status')
      params.status = status
    }
    
    if (enforcedBy) {
      conditions.push('p.enforcedBy = $enforcedBy')
      params.enforcedBy = enforcedBy
    }
    
    if (conditions.length > 0) {
      cypher += ' WHERE ' + conditions.join(' AND ')
    }
    
    cypher += `
      OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
      OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(p)
      OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
      WITH p, enforcer, 
           collect(DISTINCT subject.name) as subjectTeams,
           collect(DISTINCT tech.name) as governedTechnologies
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
             size(governedTechnologies) as technologyCount
      ORDER BY 
        CASE p.severity
          WHEN 'critical' THEN 1
          WHEN 'error' THEN 2
          WHEN 'warning' THEN 3
          WHEN 'info' THEN 4
        END,
        p.effectiveDate DESC,
        p.name
    `
    
    const { records } = await driver.executeQuery(cypher, params)
    
    const policies: Policy[] = records.map(record => ({
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
      technologyCount: record.get('technologyCount').toNumber()
    }))
    
    return {
      success: true,
      data: policies,
      count: policies.length
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policies'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
