import type { ApiResponse } from '~~/types/api'
import { SystemService } from '../services/system.service'

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
  const user = await requireAuth(event)
  const body = await readBody<CreateSystemRequest>(event)
  
  try {
    const systemService = new SystemService()
    const name = await systemService.create({ ...body, userId: user.id })

    setResponseStatus(event, 201)
    return {
      success: true,
      data: [{ name }],
      count: 1
    }
  } catch (error: unknown) {
    // Re-throw createError exceptions to preserve HTTP status codes
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create system'
    })
  }
})
