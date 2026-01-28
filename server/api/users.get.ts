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
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           teamCount:
 *                             type: integer
 *                 count:
 *                   type: integer
 *                   description: Number of items in current page
 *                 total:
 *                   type: integer
 *                   description: Total number of items
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
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0

    const userService = new UserService()
    const allUsers = await userService.findAllSummary()
    const total = allUsers.length
    const paginatedUsers = allUsers.slice(offset, offset + limit)
    
    return {
      success: true,
      data: paginatedUsers,
      count: paginatedUsers.length,
      total
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users'
    })
  }
})
