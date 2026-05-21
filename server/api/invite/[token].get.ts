import { userService } from '../../services/singletons'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token is required' })
  }

  const pending = await userService.findByInviteToken(token)
  if (!pending) {
    throw createError({ statusCode: 404, message: 'Invite not found or already claimed' })
  }

  const expiresAt = pending.inviteExpiresAt ? new Date(pending.inviteExpiresAt) : null
  if (expiresAt && expiresAt < new Date()) {
    throw createError({ statusCode: 410, message: 'This invite link has expired' })
  }

  return {
    success: true,
    data: {
      githubUsername: pending.githubUsername,
      name: pending.name,
      avatarUrl: pending.avatarUrl,
      expiresAt: pending.inviteExpiresAt
    }
  }
})
