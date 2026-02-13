import type { ApiResponse } from '~~/types/api'
import { TechnologyService } from '../services/technology.service'

/**
 * @openapi
 * /technologies:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Create a new technology
 *     description: Creates a new technology entry, optionally linking it to a source component
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique technology name
 *               category:
 *                 type: string
 *                 enum: [language, framework, library, database, platform, tool, runtime, other]
 *               vendor:
 *                 type: string
 *               ownerTeam:
 *                 type: string
 *               componentName:
 *                 type: string
 *                 description: Component name — all versions with this name and packageManager will be linked
 *               componentPackageManager:
 *                 type: string
 *     responses:
 *       201:
 *         description: Technology created
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Technology already exists
 *       422:
 *         description: Invalid field values
 */

interface CreateTechnologyRequest {
  name: string
  category: string
  vendor?: string
  ownerTeam?: string
  componentName?: string
  componentPackageManager?: string
}

interface CreateTechnologyResponse {
  name: string
}

export default defineEventHandler(async (event): Promise<ApiResponse<CreateTechnologyResponse>> => {
  const user = await requireAuth(event)
  const body = await readBody<CreateTechnologyRequest>(event)

  try {
    const service = new TechnologyService()
    const name = await service.create({ ...body, userId: user.id })

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
