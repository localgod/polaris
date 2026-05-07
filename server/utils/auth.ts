import { getServerSession } from '#auth'
import type { H3Event } from 'h3'
import { tokenService, userService } from '../services/singletons'
import { UserRepository } from '../repositories/user.repository'
import { TeamRepository } from '../repositories/team.repository'
import { logger } from './logger'

const IMPERSONATE_COOKIE = 'polaris-impersonate'

/**
 * Get the real (non-impersonated) user from session or Bearer token
 */
async function getRealUser(event: H3Event) {
  // Check for Bearer token first
  const authHeader = getHeader(event, 'authorization')
  
  const match = authHeader?.match(/^Bearer\s+(\S+)$/i)
  if (match) {
    const token = match[1]
    
    try {
      const resolved = await tokenService.resolveToken(token)
      
      if (resolved) {
        return {
          id: resolved.user.id,
          email: resolved.user.email,
          role: resolved.user.role,
          teams: resolved.user.teams || []
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Token resolution failed')
    }
  }
  
  const session = await getServerSession(event)
  return session?.user || null
}

/**
 * Get the current user from session OR Bearer token.
 * If the real user is a superuser and has an active impersonation cookie,
 * returns the impersonated user's data instead.
 */
export async function getCurrentUser(event: H3Event) {
  const realUser = await getRealUser(event)
  if (!realUser) return null

  const impersonateUserId = getCookie(event, IMPERSONATE_COOKIE)
  if (!impersonateUserId || realUser.role !== 'superuser') {
    return realUser
  }

  // Load the impersonated user's data
  try {
    const authData = await userService.getAuthData(impersonateUserId)
    if (authData) {
      return {
        id: impersonateUserId,
        email: authData.email,
        role: authData.role,
        teams: authData.teams || []
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Impersonation lookup failed')
  }

  // Target user not found — fall back to real user
  return realUser
}

/**
 * Get the real user, ignoring impersonation.
 * Used by impersonation endpoints to verify superuser status.
 */
export { getRealUser }

/**
 * When a superuser is actively impersonating another user, return the real
 * superuser's ID so it can be stored alongside the impersonated userId in
 * audit log entries.  Returns null when no impersonation is in effect.
 */
export async function getImpersonatorId(event: H3Event): Promise<string | null> {
  const [realUser, currentUser] = await Promise.all([
    getRealUser(event),
    getCurrentUser(event)
  ])
  if (!realUser || !currentUser) return null
  return realUser.id !== currentUser.id ? realUser.id : null
}

/**
 * Check if the current user is authenticated
 */
export async function requireAuth(event: H3Event) {
  const user = await getCurrentUser(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required'
    })
  }
  
  return user
}

/**
 * Check if the current user is a superuser
 */
export async function requireSuperuser(event: H3Event) {
  const user = await requireAuth(event)
  
  if (user.role !== 'superuser') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Superuser access required'
    })
  }
  
  return user
}

/**
 * Check if the current user belongs to at least one team
 */
export async function requireTeamMembership(event: H3Event) {
  const user = await requireAuth(event)
  
  if (!user.teams || user.teams.length === 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Team membership required. Please contact an administrator to be assigned to a team.'
    })
  }
  
  return user
}

/**
 * Check if the current user is authorized (authenticated + has team membership or is superuser)
 */
export async function requireAuthorization(event: H3Event) {
  const user = await requireAuth(event)
  
  // Superusers are always authorized
  if (user.role === 'superuser') {
    return user
  }
  
  // Regular users must belong to a team
  if (!user.teams || user.teams.length === 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Authorization required. Please contact an administrator to be assigned to a team.'
    })
  }
  
  return user
}

/**
 * Check if the current user can manage a specific team
 */
export async function canManageTeam(event: H3Event, teamName: string) {
  const user = await requireAuth(event)
  
  // Superusers can manage any team
  if (user.role === 'superuser') {
    return true
  }
  
  // Check if user has CAN_MANAGE relationship with the team
  const userRepo = new UserRepository()
  return await userRepo.canManageTeam(user.id, teamName)
}

/**
 * Check if the current user belongs to a specific team
 */
export async function isMemberOfTeam(event: H3Event, teamName: string) {
  const user = await requireAuth(event)
  
  // Superusers have access to all teams
  if (user.role === 'superuser') {
    return true
  }
  
  // Check if user is a member of the team
  return user.teams?.some(team => team.name === teamName) || false
}

/**
 * Require that the user belongs to a specific team
 */
export async function requireTeamAccess(event: H3Event, teamName: string) {
  const user = await requireAuthorization(event)
  
  // Superusers have access to all teams
  if (user.role === 'superuser') {
    return user
  }
  
  // Check if user is a member of the team
  const isMember = user.teams?.some(team => team.name === teamName)
  
  if (!isMember) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Access denied. You must be a member of team "${teamName}" to perform this action.`
    })
  }
  
  return user
}

/**
 * Get the list of team names the current user belongs to
 */
export async function getUserTeams(event: H3Event): Promise<string[]> {
  const user = await requireAuth(event)
  
  // Superusers have access to all teams
  if (user.role === 'superuser') {
    const teamRepo = new TeamRepository()
    return await teamRepo.findAllNames()
  }
  
  return user.teams?.map(team => team.name) || []
}

/**
 * Validate that a resource belongs to one of the user's teams
 * Used for checking if user can modify systems, technologies, etc.
 */
export async function validateTeamOwnership(
  event: H3Event,
  resourceType: 'System' | 'Technology',
  resourceName: string
): Promise<void> {
  const user = await requireAuthorization(event)
  
  // Superusers can modify anything
  if (user.role === 'superuser') {
    return
  }
  
  const teamNames = user.teams?.map(team => team.name) || []
  const teamRepo = new TeamRepository()
  let hasAccess = false

  if (resourceType === 'System') {
    hasAccess = await teamRepo.ownsSystem(teamNames, resourceName)
  } else if (resourceType === 'Technology') {
    hasAccess = await teamRepo.stewardsTechnology(teamNames, resourceName)
  }

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Access denied. This ${resourceType.toLowerCase()} is not owned by any of your teams.`
    })
  }
}
