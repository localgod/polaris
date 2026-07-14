import { tokenService } from '../../../../../services/singletons'
import { AuditLogRepository } from '../../../../../repositories/audit-log.repository'
import { auditFailedOperation } from '../../../../../utils/audit'

/**
 * @openapi
 * /admin/users/{userId}/tokens/{tokenId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Revoke an API token
 *     description: Revokes the specified API token. Superuser only.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token revoked
 *       404:
 *         description: Token not found
 */
export default defineEventHandler(async (event) => {
  const currentUser = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const tokenId = getRouterParam(event, 'tokenId')
  if (!tokenId) {
    throw createError({ statusCode: 400, message: 'tokenId is required' })
  }

  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  try {
    const revoked = await tokenService.revokeToken(tokenId, userId)

    if (!revoked) {
      throw createError({ statusCode: 404, message: 'Token not found' })
    }
    const auditRepo = new AuditLogRepository()
    await auditRepo.create({
      operation: 'DELETE',
      entityType: 'ApiToken',
      entityId: tokenId,
      entityLabel: `Token ${tokenId} for user ${userId}`,
      userId: currentUser.id,
      realUserId
    })

    return { success: true, message: 'Token revoked' }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'DELETE',
      entityType: 'ApiToken',
      entityId: tokenId,
      reason: error instanceof Error ? error.message : 'Failed to revoke token',
      userId: currentUser.id,
      realUserId
    })
    throw error
  }
})
