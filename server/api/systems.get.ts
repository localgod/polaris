import type { ApiResponse, System } from '~~/types/api'

export default defineEventHandler(async (): Promise<ApiResponse<System>> => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (s:System)
      OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
      OPTIONAL MATCH (s)-[:USES]->(c:Component)
      RETURN s.name as name,
             s.domain as domain,
             s.ownerTeam as ownerTeam,
             s.businessCriticality as businessCriticality,
             s.environment as environment,
             team.name as ownerTeamName,
             count(DISTINCT c) as componentCount
      ORDER BY s.businessCriticality DESC, s.name
    `)
    
    const systems: System[] = records.map(record => ({
      name: record.get('name'),
      domain: record.get('domain'),
      ownerTeam: record.get('ownerTeam'),
      businessCriticality: record.get('businessCriticality'),
      environment: record.get('environment'),
      ownerTeamName: record.get('ownerTeamName'),
      componentCount: record.get('componentCount').toNumber()
    }))
    
    return {
      success: true,
      data: systems,
      count: systems.length
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch systems'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
