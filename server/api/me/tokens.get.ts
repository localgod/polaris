import { getRealUser } from '../../utils/auth'
import { tokenService } from '../../services/singletons'

/**
 * @openapi
 * /me/tokens:
 *   get:
 *     tags:
 *       - Me
 *     summary: List own API tokens
 *     description: Returns all tokens belonging to the authenticated user (without hashes).
 *     responses:
 *       200:
 *         description: Tokens listed
 *       401:
 *         description: Not authenticated
 */
export default defineEventHandler(async (event) => {
  // Use getRealUser so a superuser impersonating another user always manages
  // their own tokens, not the impersonated user's tokens.
  const user = await getRealUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const tokens = await tokenService.listTokens(user.id)

  return {
    success: true,
    data: tokens,
    count: tokens.length
  }
})
