import { userService } from '../../services/singletons'
import { parseSearchParam } from '../../utils/query-params'
import { auditSensitiveRead } from '../../utils/audit'

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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive search on user email or name
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
  const currentUser = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0

    const allUsers = await userService.findAllSummary({
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc'
    }, parseSearchParam(query.search))
    const total = allUsers.length
    const paginatedUsers = allUsers.slice(offset, offset + limit)

    await auditSensitiveRead(event, {
      entityType: 'User',
      entityId: 'all',
      reason: 'Listed users',
      userId: currentUser.id,
      realUserId
    })

    return {
      success: true,
      data: paginatedUsers,
      count: paginatedUsers.length,
      total
    }
  } catch (error) {
    event.context.logger.error({ err: error }, 'Error fetching users')
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users'
    })
  }
})
