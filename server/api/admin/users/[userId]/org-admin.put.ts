import { userService } from '../../../../services/singletons'
import { auditFailedOperation } from '../../../../utils/audit'

/**
 * @openapi
 * /admin/users/{userId}/org-admin:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update user org-admin flag
 *     description: |
 *       Grants or revokes organization admin access for a user.
 *       Org-admins can activate and archive TechnologyPolicies and manage PolicyExceptions.
 *
 *       **Authorization:** Superuser
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
 *               - orgAdmin
 *             properties:
 *               orgAdmin:
 *                 type: boolean
 *           example:
 *             orgAdmin: true
 *     responses:
 *       200:
 *         description: Org-admin status updated successfully
 *       400:
 *         description: Invalid body or missing parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
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
  const { orgAdmin } = body

  if (typeof orgAdmin !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'orgAdmin must be a boolean' })
  }

  try {
    const user = await userService.updateOrgAdmin({
      userId,
      orgAdmin,
      performedBy: currentUser.id,
      realUserId
    })

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'User not found' })
    }

    return { success: true, data: user }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'CHANGE_ORG_ADMIN',
      entityType: 'User',
      entityId: userId,
      reason: error instanceof Error ? error.message : 'Failed to update org-admin status',
      userId: currentUser.id,
      realUserId
    })
    throw error
  }
})
