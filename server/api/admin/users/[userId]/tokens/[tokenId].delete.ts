import { TokenService } from '../../../../../services/token.service'
import { AuditLogRepository } from '../../../../../repositories/audit-log.repository'

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
  await requireSuperuser(event)

  const tokenId = getRouterParam(event, 'tokenId')
  if (!tokenId) {
    throw createError({ statusCode: 400, message: 'tokenId is required' })
  }

  const tokenService = new TokenService()
  const revoked = await tokenService.revokeToken(tokenId)

  if (!revoked) {
    throw createError({ statusCode: 404, message: 'Token not found' })
  }

  const userId = getRouterParam(event, 'userId')
  const currentUser = await getCurrentUser(event)
  const auditRepo = new AuditLogRepository()
  await auditRepo.create({
    operation: 'DELETE',
    entityType: 'ApiToken',
    entityId: tokenId,
    entityLabel: `Token ${tokenId} for user ${userId}`,
    userId: currentUser.id
  })

  return { success: true, message: 'Token revoked' }
})
