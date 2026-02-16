import { UserRepository } from '../../repositories/user.repository'
import { TokenService } from '../../services/token.service'
import { AuditLogRepository } from '../../repositories/audit-log.repository'

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user details
 *     description: Returns full user details including teams, tokens (technical users), and recent audit activity. Superuser only.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const userRepo = new UserRepository()
  const user = await userRepo.findById(id)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // For technical users, include tokens
  let tokens: { id: string; createdAt: string; expiresAt: string | null; revoked: boolean; description: string | null }[] = []
  if (user.provider === 'technical') {
    const tokenService = new TokenService()
    tokens = await tokenService.listTokens(id)
  }

  // Get recent audit activity by this user
  const auditRepo = new AuditLogRepository()
  const auditLogs = await auditRepo.findAll({ userId: id, limit: 10, offset: 0 })

  return {
    success: true,
    data: {
      ...user,
      tokens,
      recentActivity: auditLogs
    }
  }
})
