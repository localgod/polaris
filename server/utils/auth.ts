import { getServerSession } from '#auth'
import type { H3Event } from 'h3'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import { TokenService } from '../services/token.service'
import { UserService } from '../services/user.service'

const IMPERSONATE_COOKIE = 'polaris-impersonate'

/**
 * Get the real (non-impersonated) user from session or Bearer token
 */
async function getRealUser(event: H3Event) {
  // Check for Bearer token first
  const authHeader = getHeader(event, 'authorization')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    
    try {
      const tokenService = new TokenService()
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
      console.error('Token resolution failed:', error)
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
    const userService = new UserService()
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
    console.error('Impersonation lookup failed:', error)
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
  const driver = useDriver()
  const session = driver.session()
  
  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:CAN_MANAGE]->(t:Team {name: $teamName})
      RETURN count(t) > 0 as canManage
      `,
      { userId: user.id, teamName }
    )
    
    return result.records[0]?.get('canManage') || false
  } finally {
    await session.close()
  }
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
    const driver = useDriver()
    const session = driver.session()
    
    try {
      const result = await session.run('MATCH (t:Team) RETURN t.name as name')
      return result.records.map((record: Neo4jRecord) => record.get('name'))
    } finally {
      await session.close()
    }
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
  
  const driver = useDriver()
  const session = driver.session()
  
  try {
    let query = ''
    
    if (resourceType === 'System') {
      // Check if system is owned by one of user's teams
      query = `
        MATCH (s:System {name: $resourceName})
        MATCH (t:Team)-[:OWNS]->(s)
        WHERE t.name IN $teamNames
        RETURN count(s) > 0 as hasAccess
      `
    } else if (resourceType === 'Technology') {
      // Check if technology is stewarded by one of user's teams
      query = `
        MATCH (tech:Technology {name: $resourceName})
        MATCH (t:Team)-[:STEWARDED_BY]->(tech)
        WHERE t.name IN $teamNames
        RETURN count(tech) > 0 as hasAccess
      `
    }
    
    const teamNames = user.teams?.map(team => team.name) || []
    const result = await session.run(query, { resourceName, teamNames })
    
    const hasAccess = result.records[0]?.get('hasAccess') || false
    
    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: `Access denied. This ${resourceType.toLowerCase()} is not owned by any of your teams.`
      })
    }
  } finally {
    await session.close()
  }
}
