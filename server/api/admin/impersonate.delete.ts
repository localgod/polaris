import { getRealUser } from '../../utils/auth'
import { AuditLogRepository } from '../../repositories/audit-log.repository'

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
    const auditRepo = new AuditLogRepository()
    await auditRepo.create({
      operation: 'IMPERSONATION_STOPPED',
      entityType: 'User',
      entityId: impersonatedUserId,
      entityLabel: impersonatedUserId,
      userId: realUser.id,
    })
  }

  return { success: true }
})
