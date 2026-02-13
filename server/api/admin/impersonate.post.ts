import { getRealUser } from '../../utils/auth'
import { UserService } from '../../services/user.service'

/**
 * Start impersonating a user. Superuser only.
 * Sets a cookie that causes getCurrentUser to return the target user's data.
 */
export default defineEventHandler(async (event) => {
  const realUser = await getRealUser(event)

  if (!realUser || realUser.role !== 'superuser') {
    throw createError({ statusCode: 403, message: 'Superuser access required' })
  }

  const body = await readBody<{ userId: string }>(event)

  if (!body?.userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  // Prevent impersonating yourself
  if (body.userId === realUser.id) {
    throw createError({ statusCode: 422, message: 'Cannot impersonate yourself' })
  }

  // Verify target user exists
  const userService = new UserService()
  const target = await userService.findById(body.userId)

  if (!target) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  setCookie(event, 'polaris-impersonate', body.userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 // 1 hour
  })

  return {
    success: true,
    impersonating: {
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role
    }
  }
})
