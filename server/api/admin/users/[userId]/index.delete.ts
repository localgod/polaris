import { UserRepository } from '../../../../repositories/user.repository'
import { AuditLogRepository } from '../../../../repositories/audit-log.repository'

/**
 * @openapi
 * /admin/users/{userId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a technical user
 *     description: Deletes a technical user and all associated tokens. Superuser only.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  const userRepo = new UserRepository()
  const user = await userRepo.findById(userId)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (user.provider !== 'technical') {
    throw createError({ statusCode: 400, message: 'Only technical users can be deleted' })
  }

  await userRepo.deleteUser(userId)

  const currentUser = await getCurrentUser(event)
  const auditRepo = new AuditLogRepository()
  await auditRepo.create({
    operation: 'DELETE',
    entityType: 'User',
    entityId: userId,
    entityLabel: user.name || user.email,
    userId: currentUser.id
  })

  return { success: true, message: 'Technical user deleted' }
})
