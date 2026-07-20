import { UserRepository } from '../../../../repositories/user.repository'
import { tokenService } from '../../../../services/singletons'
import { VALID_TOKEN_TYPES } from '../../../../services/token.service'
import { AuditLogRepository } from '../../../../repositories/audit-log.repository'
import { auditFailedOperation } from '../../../../utils/audit'

/**
 * @openapi
 * /admin/users/{userId}/tokens:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Generate an API token for a technical user
 *     description: |
 *       Creates a new API token for the specified technical user.
 *       The plaintext token is returned only once in the response.
 *       Superuser only.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               expiresInDays:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [user, ci-cd, service-account]
 *                 description: Defaults to "service-account" since these tokens belong to technical users, not people.
 *     responses:
 *       201:
 *         description: Token created
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 *       422:
 *         description: Invalid token type
 */
export default defineEventHandler(async (event) => {
  const currentUser = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  try {
    const userRepo = new UserRepository()
    const user = await userRepo.findById(userId)

    if (!user) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    if (user.provider !== 'technical') {
      throw createError({ statusCode: 400, message: 'Tokens can only be generated for technical users' })
    }

    const body = await readBody(event) || {}

    if (body.type !== undefined && !VALID_TOKEN_TYPES.includes(body.type)) {
      throw createError({ statusCode: 422, message: `Invalid token type. Must be one of: ${VALID_TOKEN_TYPES.join(', ')}` })
    }

    const result = await tokenService.createToken(userId, {
      description: body.description || null,
      expiresInDays: body.expiresInDays || undefined,
      type: body.type ?? 'service-account'
    })

    const auditRepo = new AuditLogRepository()
    await auditRepo.create({
      operation: 'CREATE',
      entityType: 'ApiToken',
      entityId: result.id,
      entityLabel: `Token for ${user.name || user.email}`,
      changedFields: ['description', 'expiresAt', 'type'],
      userId: currentUser.id,
      realUserId,
      correlationId: event.context.correlationId ?? null
    })

    setResponseStatus(event, 201)
    return {
      success: true,
      data: result
    }
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'CREATE',
      entityType: 'ApiToken',
      entityId: userId,
      reason: error instanceof Error ? error.message : 'Failed to create token',
      userId: currentUser.id,
      realUserId
    })
    throw error
  }
})
