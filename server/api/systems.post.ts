import type { ApiResponse } from '~~/types/api'
import { normalizeRepoUrl } from '~~/server/utils/repository'

interface CreateSystemRequest {
  name: string
  domain: string
  ownerTeam: string
  businessCriticality: string
  environment: string
  sourceCodeType?: string
  hasSourceAccess?: boolean
  repositories?: Array<{
    url: string
    scmType: string
    name: string
    isPublic: boolean
    requiresAuth: boolean
  }>
}

interface CreateSystemResponse {
  name: string
}

export default defineEventHandler(async (event): Promise<ApiResponse<CreateSystemResponse>> => {
  try {
    const body = await readBody<CreateSystemRequest>(event)
    
    // Validate required fields
    if (!body.name || !body.domain || !body.ownerTeam || !body.businessCriticality || !body.environment) {
      return {
        success: false,
        error: 'Missing required fields',
        data: []
      }
    }

    // Validate businessCriticality
    const validCriticalities = ['critical', 'high', 'medium', 'low']
    if (!validCriticalities.includes(body.businessCriticality)) {
      return {
        success: false,
        error: 'Invalid business criticality value',
        data: []
      }
    }

    // Validate environment
    const validEnvironments = ['dev', 'test', 'staging', 'prod']
    if (!validEnvironments.includes(body.environment)) {
      return {
        success: false,
        error: 'Invalid environment value',
        data: []
      }
    }

    const driver = useDriver()
    
    // Check if system already exists
    const checkResult = await driver.executeQuery(`
      MATCH (s:System {name: $name})
      RETURN s
    `, { name: body.name })

    if (checkResult.records.length > 0) {
      return {
        success: false,
        error: 'A system with this name already exists',
        data: []
      }
    }

    // Derive source code properties from repositories
    const hasRepositories = body.repositories && body.repositories.length > 0
    const hasSourceAccess = hasRepositories
    const sourceCodeType = hasRepositories
      ? (body.repositories!.some(r => r.isPublic) ? 'open-source' : 'proprietary')
      : 'unknown'

    // Normalize repository URLs
    const repositories = (body.repositories || []).map(repo => ({
      ...repo,
      url: normalizeRepoUrl(repo.url)
    }))

    // Create system and all repositories in a single query
    const result = await driver.executeQuery(`
      MERGE (team:Team {name: $ownerTeam})
      CREATE (s:System {
        name: $name,
        domain: $domain,
        businessCriticality: $businessCriticality,
        environment: $environment,
        sourceCodeType: $sourceCodeType,
        hasSourceAccess: $hasSourceAccess
      })
      CREATE (team)-[:OWNS]->(s)
      
      WITH s, team
      UNWIND $repositories AS repo
      MERGE (r:Repository {url: repo.url})
      SET r.scmType = repo.scmType,
          r.name = repo.name,
          r.isPublic = repo.isPublic,
          r.requiresAuth = repo.requiresAuth,
          r.createdAt = COALESCE(r.createdAt, datetime()),
          r.lastSyncedAt = datetime()
      MERGE (s)-[rel1:HAS_SOURCE_IN]->(r)
        SET rel1.addedAt = COALESCE(rel1.addedAt, datetime())
      MERGE (team)-[rel2:MAINTAINS]->(r)
        SET rel2.since = COALESCE(rel2.since, datetime())
      
      WITH s, count(r) as repoCount
      RETURN s.name as name, repoCount
    `, {
      name: body.name,
      domain: body.domain,
      ownerTeam: body.ownerTeam,
      businessCriticality: body.businessCriticality,
      environment: body.environment,
      sourceCodeType: sourceCodeType,
      hasSourceAccess: hasSourceAccess,
      repositories: repositories.length > 0 ? repositories : [{ url: '', scmType: '', name: '', isPublic: false, requiresAuth: false }]
    })

    if (result.records.length === 0) {
      return {
        success: false,
        error: 'Failed to create system',
        data: []
      }
    }

    return {
      success: true,
      data: [{
        name: result.records[0].get('name')
      }],
      count: 1
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create system'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
