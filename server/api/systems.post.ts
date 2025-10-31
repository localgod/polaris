import type { ApiResponse } from '~~/types/api'
import { normalizeRepoUrl } from '~~/server/utils/repository'

/**
 * @openapi
 * /systems:
 *   post:
 *     tags:
 *       - Systems
 *     summary: Create a new system
 *     description: Creates a new system with optional repositories
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - domain
 *               - ownerTeam
 *               - businessCriticality
 *               - environment
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique system name
 *               domain:
 *                 type: string
 *                 description: Business domain
 *               ownerTeam:
 *                 type: string
 *                 description: Team that owns this system
 *               businessCriticality:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *                 description: Business criticality level
 *               environment:
 *                 type: string
 *                 enum: [dev, test, staging, prod]
 *                 description: Environment type
 *               repositories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - url
 *                     - scmType
 *                     - name
 *                     - isPublic
 *                     - requiresAuth
 *                   properties:
 *                     url:
 *                       type: string
 *                     scmType:
 *                       type: string
 *                     name:
 *                       type: string
 *                     isPublic:
 *                       type: boolean
 *                     requiresAuth:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: System created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       409:
 *         description: System already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       422:
 *         description: Invalid field values
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */

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
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }

    // Validate businessCriticality
    const validCriticalities = ['critical', 'high', 'medium', 'low']
    if (!validCriticalities.includes(body.businessCriticality)) {
      throw createError({
        statusCode: 422,
        message: 'Invalid business criticality value. Must be one of: critical, high, medium, low'
      })
    }

    // Validate environment
    const validEnvironments = ['dev', 'test', 'staging', 'prod']
    if (!validEnvironments.includes(body.environment)) {
      throw createError({
        statusCode: 422,
        message: 'Invalid environment value. Must be one of: dev, test, staging, prod'
      })
    }

    const driver = useDriver()
    
    // Check if system already exists
    const checkResult = await driver.executeQuery(`
      MATCH (s:System {name: $name})
      RETURN s
    `, { name: body.name })

    if (checkResult.records.length > 0) {
      throw createError({
        statusCode: 409,
        message: `A system with the name '${body.name}' already exists`
      })
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

    setResponseStatus(event, 201)
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
