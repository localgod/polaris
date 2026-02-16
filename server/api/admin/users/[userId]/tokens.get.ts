import { TokenService } from '../../../../services/token.service'

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
  await requireSuperuser(event)

  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  const tokenService = new TokenService()
  const tokens = await tokenService.listTokens(userId)

  return {
    success: true,
    data: tokens,
    count: tokens.length
  }
})
