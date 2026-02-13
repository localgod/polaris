import { getRealUser } from '../../utils/auth'

/**
 * Stop impersonating. Clears the impersonation cookie.
 */
export default defineEventHandler(async (event) => {
  const realUser = await getRealUser(event)

  if (!realUser || realUser.role !== 'superuser') {
    throw createError({ statusCode: 403, message: 'Superuser access required' })
  }

  deleteCookie(event, 'polaris-impersonate', {
    path: '/'
  })

  return { success: true }
})
