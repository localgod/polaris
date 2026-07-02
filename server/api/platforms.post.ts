import type { ApiResponse } from '~~/types/api'
import { platformService } from '../services/singletons'

/**
 * @openapi
 * /platforms:
 *   post:
 *     tags:
 *       - Platforms
 *     summary: Create a new platform
 *     description: |
 *       Creates a manually-declared platform entry — infrastructure or services (e.g. PostgreSQL, Kubernetes)
 *       that can never be observed by SBOM scanning. Unlike Technology, a Platform carries no evidence
 *       requirement, so creation is deliberately restricted to superusers.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique platform name
 *               type:
 *                 type: string
 *                 enum: [application, framework, library, container, platform, operating-system, device, device-driver, firmware, file, machine-learning-model, data]
 *               domain:
 *                 type: string
 *                 enum: [foundational-runtime, framework, data-platform, integration-platform, security-identity, infrastructure, observability, developer-tooling, other]
 *               vendor:
 *                 type: string
 *               stewardTeam:
 *                 type: string
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       201:
 *         description: Platform created
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Superuser access required
 *       409:
 *         description: Platform already exists
 *       422:
 *         description: Invalid field values
 */

interface CreatePlatformRequest {
  name: string
  type: string
  domain?: string
  vendor?: string
  stewardTeam?: string
}

interface CreatePlatformResponse {
  name: string
}

export default defineEventHandler(async (event): Promise<ApiResponse<CreatePlatformResponse>> => {
  const user = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)
  const body = await readBody<CreatePlatformRequest>(event)

  try {
    const name = await platformService.create({ ...body, userId: user.id, realUserId })

    setResponseStatus(event, 201)
    return {
      success: true,
      data: [{ name }],
      count: 1
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create platform'
    })
  }
})
