import { getRealUser } from '../../../utils/auth'
import { tokenService } from '../../../services/singletons'
import { AuditLogRepository } from '../../../repositories/audit-log.repository'
import { auditFailedOperation } from '../../../utils/audit'

/**
 * @openapi
 * /me/tokens/{tokenId}:
 *   delete:
 *     tags:
 *       - Me
 *     summary: Revoke an own API token
 *     description: |
 *       Revokes the specified token. Ownership is enforced — users can only
 *       revoke their own tokens.
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token revoked
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Token not found or not owned by the current user
 */
export default defineEventHandler(async (event) => {
  // Use getRealUser so a superuser impersonating another user always revokes
  // their own tokens, not the impersonated user's tokens.
  const user = await getRealUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const tokenId = getRouterParam(event, 'tokenId')
  if (!tokenId) {
    throw createError({ statusCode: 400, message: 'tokenId is required' })
  }

  try {
    // revokeToken enforces ownership via the userId match in the Cypher query.
    const revoked = await tokenService.revokeToken(tokenId, user.id)

    if (!revoked) {
      throw createError({ statusCode: 404, message: 'Token not found' })
    }

    const auditRepo = new AuditLogRepository()
    await auditRepo.create({
      operation: 'DELETE',
      entityType: 'ApiToken',
      entityId: tokenId,
      entityLabel: `Token ${tokenId} for user ${user.id}`,
      userId: user.id,
      realUserId: null
    })

    return { success: true, message: 'Token revoked' }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'DELETE',
      entityType: 'ApiToken',
      entityId: tokenId,
      reason: error instanceof Error ? error.message : 'Failed to revoke token',
      userId: user.id,
      realUserId: null
    })
    throw error
  }
})
