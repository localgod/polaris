import { userService } from '../../../../services/singletons'
import { auditFailedOperation } from '../../../../utils/audit'

/**
 * @openapi
 * /admin/users/{userId}/role:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update user role
 *     description: |
 *       Grants or revokes superuser access for a user.
 *
 *       **Authorization:** Superuser
 *
 *       **Constraints:**
 *       - A superuser cannot demote themselves
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, superuser]
 *           example:
 *             role: superuser
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Invalid role value or missing parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required, or attempting to demote yourself
 *       404:
 *         description: User not found
 */
export default defineEventHandler(async (event) => {
  const currentUser = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'User ID is required' })
  }

  const body = await readBody(event)
  const { role } = body

  if (role !== 'user' && role !== 'superuser') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Role must be "user" or "superuser"' })
  }

  try {
    // Prevent a superuser from demoting themselves
    const actingAs = realUserId ?? currentUser.id
    if (role === 'user' && actingAs === userId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'You cannot remove your own superuser access' })
    }

    const user = await userService.updateRole({
      userId,
      role,
      performedBy: currentUser.id,
      realUserId
    })

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'User not found' })
    }

    return { success: true, data: user }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'CHANGE_ROLE',
      entityType: 'User',
      entityId: userId,
      reason: error instanceof Error ? error.message : 'Failed to update role',
      userId: currentUser.id,
      realUserId
    })
    throw error
  }
})
