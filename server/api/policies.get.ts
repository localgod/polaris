export default defineEventHandler(async () => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (p:Policy)
      OPTIONAL MATCH (p)-[:APPLIES_TO]->(tech:Technology)
      RETURN p.name as name,
             p.description as description,
             p.ruleType as ruleType,
             p.severity as severity,
             count(DISTINCT tech) as technologyCount,
             collect(DISTINCT tech.name) as technologies
      ORDER BY 
        CASE p.severity
          WHEN 'critical' THEN 1
          WHEN 'error' THEN 2
          WHEN 'warning' THEN 3
          WHEN 'info' THEN 4
        END,
        p.name
    `)
    
    const policies = records.map(record => ({
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      technologyCount: record.get('technologyCount').toNumber(),
      technologies: record.get('technologies').filter((t: string) => t)
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
