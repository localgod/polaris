import { getRealUser } from '../../utils/auth'
import { tokenService } from '../../services/singletons'
import { VALID_TOKEN_TYPES } from '../../services/token.service'
import { AuditLogRepository } from '../../repositories/audit-log.repository'
import { auditFailedOperation } from '../../utils/audit'

const MAX_ACTIVE_TOKENS = 10

/**
 * @openapi
 * /me/tokens:
 *   post:
 *     tags:
 *       - Me
 *     summary: Generate an API token for the authenticated user
 *     description: |
 *       Creates a new API token for the currently authenticated user.
 *       The plaintext token is returned only once in the response.
 *       Maximum 10 active tokens per user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *               expiresInDays:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [user, ci-cd, service-account]
 *                 description: Defaults to "user". Distinguishes automation tokens from personal ones in the audit trail.
 *     responses:
 *       201:
 *         description: Token created
 *       400:
 *         description: Missing description or token cap reached
 *       401:
 *         description: Not authenticated
 *       422:
 *         description: Invalid token type
 */
export default defineEventHandler(async (event) => {
  // Use getRealUser so a superuser impersonating another user always creates
  // tokens for themselves, not for the impersonated user.
  const user = await getRealUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const body = await readBody(event) || {}

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (!description) {
    throw createError({ statusCode: 400, message: 'description is required' })
  }

  if (body.type !== undefined && !VALID_TOKEN_TYPES.includes(body.type)) {
    throw createError({ statusCode: 422, message: `Invalid token type. Must be one of: ${VALID_TOKEN_TYPES.join(', ')}` })
  }

  try {
    const activeCount = await tokenService.countActiveTokens(user.id)
    if (activeCount >= MAX_ACTIVE_TOKENS) {
      throw createError({
        statusCode: 400,
        message: `Maximum of ${MAX_ACTIVE_TOKENS} active tokens allowed. Revoke an existing token before creating a new one.`
      })
    }

    const result = await tokenService.createToken(user.id, {
      description,
      expiresInDays: body.expiresInDays || undefined,
      type: body.type
    })

    const auditRepo = new AuditLogRepository()
    await auditRepo.create({
      operation: 'CREATE',
      entityType: 'ApiToken',
      entityId: result.id,
      entityLabel: `Token for ${user.email}`,
      changedFields: ['description', 'expiresAt', 'type'],
      userId: user.id,
      realUserId: null,
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
      entityId: user.id,
      reason: error instanceof Error ? error.message : 'Failed to create token',
      userId: user.id,
      realUserId: null
    })
    throw error
  }
})
