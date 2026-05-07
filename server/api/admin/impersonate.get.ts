import { getRealUser } from '../../utils/auth'
import { userService } from '../../services/singletons'

/**
 * Get current impersonation status.
 * Returns the impersonated user's info if active, null otherwise.
 */
export default defineEventHandler(async (event) => {
  const realUser = await getRealUser(event)

  if (!realUser || realUser.role !== 'superuser') {
    return { active: false, user: null }
  }

  const impersonateUserId = getCookie(event, 'polaris-impersonate')

  if (!impersonateUserId) {
    return { active: false, user: null }
  }

  const target = await userService.findById(impersonateUserId)

  if (!target) {
    // Stale cookie — clear it
    deleteCookie(event, 'polaris-impersonate', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.COOKIE_SECURE !== 'false',
    })
    return { active: false, user: null }
  }

  return {
    active: true,
    user: {
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role
    }
  }
})
