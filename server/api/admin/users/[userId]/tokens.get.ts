import { tokenService } from '../../../../services/singletons'
import { auditSensitiveRead } from '../../../../utils/audit'

/**
 * @openapi
 * /admin/users/{userId}/tokens:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List API tokens for a user
 *     description: Returns all tokens for the specified user (without hashes). Superuser only.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tokens listed
 */
export default defineEventHandler(async (event) => {
  const currentUser = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  const tokens = await tokenService.listTokens(userId)

  await auditSensitiveRead(event, {
    entityType: 'ApiToken',
    entityId: userId,
    reason: `Listed API tokens for user ${userId}`,
    userId: currentUser.id,
    realUserId
  })

  return {
    success: true,
    data: tokens,
    count: tokens.length
  }
})
