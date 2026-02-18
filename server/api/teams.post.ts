import type { ApiResponse } from '~~/types/api'
import { TeamService } from '../services/team.service'

/**
 * @openapi
 * /teams:
 *   post:
 *     tags:
 *       - Teams
 *     summary: Create a new team
 *     description: Creates a new team. Requires superuser access.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique team name
 *               email:
 *                 type: string
 *                 description: Team contact email
 *               responsibilityArea:
 *                 type: string
 *                 description: Area of responsibility
 *     responses:
 *       201:
 *         description: Team created successfully
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Superuser access required
 *       409:
 *         description: Team already exists
 */

interface CreateTeamResponse {
  name: string
}

export default defineEventHandler(async (event): Promise<ApiResponse<CreateTeamResponse>> => {
  const user = await requireSuperuser(event)
  const body = await readBody(event)

  try {
    const teamService = new TeamService()
    const name = await teamService.create({
      name: body?.name,
      email: body?.email,
      responsibilityArea: body?.responsibilityArea,
      userId: user.id
    })

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
      message: error instanceof Error ? error.message : 'Failed to create team'
    })
  }
})
