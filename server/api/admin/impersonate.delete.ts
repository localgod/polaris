import { getRealUser } from '../../utils/auth'
import { AuditLogRepository } from '../../repositories/audit-log.repository'
import { auditFailedOperation } from '../../utils/audit'

/**
 * Stop impersonating. Clears the impersonation cookie.
 */
export default defineEventHandler(async (event) => {
  const realUser = await getRealUser(event)

  if (!realUser || realUser.role !== 'superuser') {
    throw createError({ statusCode: 403, message: 'Superuser access required' })
  }

  // Capture the impersonated user id before clearing the cookie
  const impersonatedUserId = getCookie(event, 'polaris-impersonate')

  deleteCookie(event, 'polaris-impersonate', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.COOKIE_SECURE !== 'false',
  })

  if (impersonatedUserId) {
    try {
      const auditRepo = new AuditLogRepository()
      await auditRepo.create({
        operation: 'IMPERSONATION_STOPPED',
        entityType: 'User',
        entityId: impersonatedUserId,
        entityLabel: impersonatedUserId,
        userId: realUser.id,
      })
    } catch (error) {
      await auditFailedOperation(event, {
        operation: 'IMPERSONATION_STOPPED',
        entityType: 'User',
        entityId: impersonatedUserId,
        reason: error instanceof Error ? error.message : 'Failed to record impersonation stop',
        userId: realUser.id
      })
      throw error
    }
  }

  return { success: true }
})
