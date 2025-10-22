export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const severity = query.severity as string | undefined
    const team = query.team as string | undefined
    const technology = query.technology as string | undefined

    const driver = useDriver()

    // Find policy violations by checking:
    // 1. Technologies used by teams (USES) but not approved (no APPROVES)
    // 2. Technologies governed by active policies
    // 3. Teams subject to those policies
    let cypher = `
      MATCH (team:Team)-[:USES]->(tech:Technology)
      WHERE NOT (team)-[:APPROVES]->(tech)
      MATCH (policy:Policy {status: 'active'})-[:GOVERNS]->(tech)
      MATCH (team)-[:SUBJECT_TO]->(policy)
      OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
    `

    const conditions: string[] = []
    const params: Record<string, string> = {}

    if (severity) {
      conditions.push('policy.severity = $severity')
      params.severity = severity
    }

    if (team) {
      conditions.push('team.name = $team')
      params.team = team
    }

    if (technology) {
      conditions.push('tech.name = $technology')
      params.technology = technology
    }

    if (conditions.length > 0) {
      cypher += ' AND ' + conditions.join(' AND ')
    }

    cypher += `
      RETURN team.name as teamName,
             tech.name as technologyName,
             tech.category as technologyCategory,
             tech.riskLevel as riskLevel,
             policy.name as policyName,
             policy.description as policyDescription,
             policy.severity as severity,
             policy.ruleType as ruleType,
             enforcer.name as enforcedBy
      ORDER BY 
        CASE policy.severity
          WHEN 'critical' THEN 1
          WHEN 'error' THEN 2
          WHEN 'warning' THEN 3
          WHEN 'info' THEN 4
        END,
        team.name,
        tech.name
    `

    const { records } = await driver.executeQuery(cypher, params)

    const violations = records.map(record => ({
      team: record.get('teamName'),
      technology: record.get('technologyName'),
      technologyCategory: record.get('technologyCategory'),
      riskLevel: record.get('riskLevel'),
      policy: {
        name: record.get('policyName'),
        description: record.get('policyDescription'),
        severity: record.get('severity'),
        ruleType: record.get('ruleType'),
        enforcedBy: record.get('enforcedBy')
      }
    }))

    // Group violations by severity
    const summary = {
      critical: violations.filter(v => v.policy.severity === 'critical').length,
      error: violations.filter(v => v.policy.severity === 'error').length,
      warning: violations.filter(v => v.policy.severity === 'warning').length,
      info: violations.filter(v => v.policy.severity === 'info').length
    }

    return {
      success: true,
      data: violations,
      count: violations.length,
      summary
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policy violations'
    return {
      success: false,
      error: errorMessage,
      data: [],
      count: 0,
      summary: { critical: 0, error: 0, warning: 0, info: 0 }
    }
  }
})
