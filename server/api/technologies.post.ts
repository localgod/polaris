import type { ApiResponse } from '~~/types/api'
import { technologyService } from '../services/singletons'

/**
 * @openapi
 * /technologies:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Create a new technology from an unlinked component
 *     description: |
 *       Creates a new technology by claiming an existing, currently-unlinked Component —
 *       a Technology can never exist without at least one linked Component. All Component
 *       nodes sharing `componentName` that aren't already linked to a Technology are
 *       linked in the same operation. For technology that can never be observed by SBOM
 *       scanning (databases, cloud services, etc.), use POST /platforms instead.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - componentName
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique technology name
 *               type:
 *                 type: string
 *                 enum: [application, framework, library, container, platform, operating-system, device, device-driver, firmware, file, machine-learning-model, data]
 *               domain:
 *                 type: string
 *                 enum: [foundational-runtime, framework, data-platform, integration-platform, security-identity, infrastructure, observability, developer-tooling, other]
 *               vendor:
 *                 type: string
 *               ownerTeam:
 *                 type: string
 *               componentName:
 *                 type: string
 *                 description: Name of an existing, unlinked Component — all currently-unlinked versions sharing this name are linked
 *     responses:
 *       201:
 *         description: Technology created
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: No unlinked component with the given name was found
 *       409:
 *         description: Technology already exists
 *       422:
 *         description: Invalid field values
 */

interface CreateTechnologyRequest {
  name: string
  type: string
  domain?: string
  vendor?: string
  ownerTeam?: string
  componentName: string
}

interface CreateTechnologyResponse {
  name: string
}

export default defineEventHandler(async (event): Promise<ApiResponse<CreateTechnologyResponse>> => {
  const user = await requireAuth(event)
  const realUserId = await getImpersonatorId(event)
  const body = await readBody<CreateTechnologyRequest>(event)

  try {
    const name = await technologyService.createFromComponent({ ...body, userId: user.id, realUserId })

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
      message: error instanceof Error ? error.message : 'Failed to create technology'
    })
  }
})
