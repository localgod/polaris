import { getServerSession } from '#auth'
import { UserService } from '../services/user.service'

/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List all users (superuser only)
 *     description: Retrieves a list of all users with their team counts (requires superuser role)
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - type: object
 *                     properties:
 *                       teamCount:
 *                         type: integer
 *       403:
 *         description: Forbidden - superuser access required
 *       500:
 *         description: Failed to fetch users
 */
export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session || session.user?.role !== 'superuser') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Superuser access required'
    })
  }

  try {
    const userService = new UserService()
    const users = await userService.findAllSummary()
    
    return users
  } catch (error) {
    console.error('Error fetching users:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users'
    })
  }
})
