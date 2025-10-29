import type { ApiResponse, System } from '~~/types/api'

export default defineEventHandler(async (): Promise<ApiResponse<System>> => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (s:System)
      OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
      OPTIONAL MATCH (s)-[:USES]->(c:Component)
      OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
      RETURN s.name as name,
             s.domain as domain,
             team.name as ownerTeam,
             s.businessCriticality as businessCriticality,
             s.environment as environment,
             s.sourceCodeType as sourceCodeType,
             s.hasSourceAccess as hasSourceAccess,
             count(DISTINCT c) as componentCount,
             count(DISTINCT r) as repositoryCount
      ORDER BY s.businessCriticality DESC, s.name
    `)
    
    const systems: System[] = records.map(record => ({
      name: record.get('name'),
      domain: record.get('domain'),
      ownerTeam: record.get('ownerTeam'),
      businessCriticality: record.get('businessCriticality'),
      environment: record.get('environment'),
      sourceCodeType: record.get('sourceCodeType'),
      hasSourceAccess: record.get('hasSourceAccess'),
      componentCount: record.get('componentCount').toNumber(),
      repositoryCount: record.get('repositoryCount').toNumber()
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
