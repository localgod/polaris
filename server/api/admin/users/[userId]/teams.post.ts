import { UserService } from '../../../../services/user.service'

/**
 * @openapi
 * /admin/users/{userId}/teams:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Assign user to teams
 *     description: |
 *       Assigns a user to one or more teams, replacing existing team memberships.
 *       
 *       **Authorization:** Superuser
 *       
 *       **Behavior:**
 *       - Removes all existing team memberships
 *       - Creates new memberships for specified teams
 *       - Optionally grants team management permissions
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teams
 *             properties:
 *               teams:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of team names
 *               canManage:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of team names user can manage (optional)
 *           example:
 *             teams: ["frontend-team", "platform-team"]
 *             canManage: ["frontend-team"]
 *     responses:
 *       200:
 *         description: User teams updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     teams:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                     canManage:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: User ID or teams array is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: User not found
 */
export default defineEventHandler(async (event) => {
  // Require superuser access
  const currentUser = await requireSuperuser(event)
  
  const userId = getRouterParam(event, 'userId')
  
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'User ID is required'
    })
  }

  const body = await readBody(event)
  
  if (!body.teams || !Array.isArray(body.teams)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Teams array is required'
    })
  }

  try {
    const userService = new UserService()
    const user = await userService.assignTeams({
      userId,
      teams: body.teams,
      canManage: body.canManage,
      performedBy: currentUser.id
    })

    setResponseStatus(event, 200)
    return {
      success: true,
      data: user
    }
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: error instanceof Error ? error.message : 'User not found'
    })
  }
})
