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

  // Neo4j DateTime objects serialise with 9-digit nanoseconds which JS Date can't parse.
  // Truncate to milliseconds before handing the value to client code.
  const toISOString = (v: unknown): string | null => {
    if (v == null) return null
    return String(v).replace(/(\.\d{3})\d+/, '$1')
  }

  const expiresAtIso = toISOString(pending.inviteExpiresAt)
  if (expiresAtIso && new Date(expiresAtIso) < new Date()) {
    throw createError({ statusCode: 410, message: 'This invite link has expired' })
  }

  return {
    success: true,
    data: {
      githubUsername: pending.githubUsername,
      name: pending.name,
      avatarUrl: pending.avatarUrl,
      expiresAt: expiresAtIso
    }
  }
})
