import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import { buildOrderByClause, type SortParams, type SortConfig } from '../utils/sorting'

const userSortConfig: SortConfig = {
  allowedFields: {
    name: 'u.name',
    provider: 'u.provider',
    role: 'u.role',
    teamCount: 'teamCount',
    lastLogin: 'u.lastLogin',
    createdAt: 'u.createdAt'
  },
  defaultOrderBy: 'u.createdAt DESC'
}

export interface UserTeam {
  name: string
  email: string | null
}

export interface User {
  id: string
  email: string
  name: string | null
  role: string
  provider: string
  avatarUrl: string | null
  lastLogin: string | null
  createdAt: string | null
  teams: UserTeam[]
  canManage: string[]
}

export interface UserSummary {
  id: string
  email: string
  name: string | null
  role: string
  provider: string
  avatarUrl: string | null
  lastLogin: string | null
  createdAt: string | null
  teamCount: number
}

export interface AssignTeamsParams {
  userId: string
  teams: string[]
  canManage?: string[]
  performedBy?: string
}

export interface CreateOrUpdateUserParams {
  id: string
  email: string
  name: string | null
  provider: string
  avatarUrl: string | null
  isSuperuser: boolean
  role: string
}

export interface UserAuthData {
  role: string
  email: string
  teams: UserTeam[]
}

/**
 * Repository for user-related data access
 */
export class UserRepository extends BaseRepository {
  /**
   * Find all users with their team memberships and management permissions
   * 
   * Results are ordered by creation date (newest first).
   * 
   * @returns Array of users
   */
  async findAll(): Promise<User[]> {
    const query = await loadQuery('users/find-all.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToUser(record))
  }

  /**
   * Find all users with team counts (summary view)
   * 
   * Results are ordered by creation date (newest first).
   * 
   * @returns Array of user summaries
   */
  async findAllSummary(sort?: SortParams): Promise<UserSummary[]> {
    let query = await loadQuery('users/find-all-summary.cypher')
    const orderBy = buildOrderByClause(sort || {}, userSortConfig)
    query = query.replace(/ORDER BY .+$/, `ORDER BY ${orderBy}`)
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToUserSummary(record))
  }

  /**
   * Find a user by ID with team memberships and management permissions
   * 
   * @param userId - User ID
   * @returns User or null if not found
   */
  async findById(userId: string): Promise<User | null> {
    const query = await loadQuery('users/find-by-id.cypher')
    const { records } = await this.executeQuery(query, { userId })
    
    if (records.length === 0) {
      return null
    }
    
    return this.mapToUser(records[0]!)
  }

  /**
   * Get user authentication data (role and teams) for JWT token
   * 
   * @param userId - User ID
   * @returns User auth data or null if not found
   */
  async getAuthData(userId: string): Promise<UserAuthData | null> {
    const query = await loadQuery('users/get-auth-data.cypher')
    const { records } = await this.executeQuery(query, { userId })
    
    if (records.length === 0) {
      return null
    }
    
    const record = records[0]!
    return {
      role: record.get('role'),
      email: record.get('email'),
      teams: record.get('teams').filter((t: UserTeam) => t.name !== null)
    }
  }

  /**
   * Create or update user on sign in
   * 
   * This operation:
   * - Creates user if not exists
   * - Updates user data on every sign in
   * - Preserves superuser role once granted
   * - Updates last login timestamp
   * 
   * @param params - User creation/update parameters
   */
  async createOrUpdateUser(params: CreateOrUpdateUserParams): Promise<void> {
    const query = await loadQuery('users/create-or-update.cypher')
    await this.executeQuery(query, params)
  }

  /**
   * Assign user to teams, replacing existing memberships
   * 
   * This operation:
   * 1. Removes all existing team memberships
   * 2. Creates new memberships for specified teams
   * 3. Optionally grants team management permissions
   * 
   * @param params - Assignment parameters
   * @returns Updated user
   * @throws Error if user not found
   */
  async assignTeams(params: AssignTeamsParams): Promise<User> {
    const { userId, teams, canManage, performedBy } = params
    
    // Capture previous team memberships for audit
    const previousUser = await this.findById(userId)
    const previousTeams = previousUser?.teams
      .map(t => t.name)
      .filter(Boolean)
      .sort() || []
    
    // Remove existing team memberships
    const removeQuery = await loadQuery('users/remove-team-memberships.cypher')
    await this.executeQuery(removeQuery, { userId })
    
    // Add new team memberships
    if (teams.length > 0) {
      const addQuery = await loadQuery('users/add-team-memberships.cypher')
      await this.executeQuery(addQuery, { userId, teamNames: teams })
    }
    
    // Add management permissions if specified
    if (canManage && canManage.length > 0) {
      const manageQuery = await loadQuery('users/add-management-permissions.cypher')
      await this.executeQuery(manageQuery, { userId, teamNames: canManage })
    }
    
    // Create individual audit log entries per team change
    const newTeams = [...teams].sort()
    const added = newTeams.filter(t => !previousTeams.includes(t))
    const removed = previousTeams.filter(t => !newTeams.includes(t))
    
    const auditEvents = [
      ...added.map(team => ({ team, operation: 'ADD_TEAM_MEMBER' as const })),
      ...removed.map(team => ({ team, operation: 'REMOVE_TEAM_MEMBER' as const }))
    ]
    
    if (auditEvents.length > 0) {
      const auditQuery = `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (performer:User {id: $performedBy})
        UNWIND $events AS evt
        MATCH (t:Team {name: evt.team})
        CREATE (a:AuditLog {
          id: randomUUID(),
          timestamp: datetime(),
          operation: evt.operation,
          entityType: 'User',
          entityId: $userId,
          entityLabel: coalesce(u.name, u.email),
          previousStatus: null,
          newStatus: evt.team,
          changedFields: ['teams'],
          reason: CASE evt.operation
            WHEN 'ADD_TEAM_MEMBER' THEN 'Added to team: ' + evt.team
            WHEN 'REMOVE_TEAM_MEMBER' THEN 'Removed from team: ' + evt.team
          END,
          source: 'API',
          userId: $performedBy
        })
        CREATE (a)-[:AUDITS]->(u)
        CREATE (a)-[:AUDITS]->(t)
        FOREACH (_ IN CASE WHEN performer IS NOT NULL THEN [1] ELSE [] END |
          CREATE (a)-[:PERFORMED_BY]->(performer)
        )
      `
      
      await this.executeQuery(auditQuery, {
        userId,
        events: auditEvents,
        performedBy: performedBy || 'anonymous'
      })
    }
    
    // Fetch and return updated user
    const user = await this.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }
    
    return user
  }

  /**
   * Map Neo4j record to User domain object
   */
  private mapToUser(record: Neo4jRecord): User {
    const user = record.get('user')
    
    // Filter out null teams and management permissions
    user.teams = user.teams.filter((t: UserTeam) => t.name !== null)
    user.canManage = user.canManage.filter((name: string) => name !== null)
    
    return user
  }

  /**
   * Map Neo4j record to UserSummary domain object
   */
  private mapToUserSummary(record: Neo4jRecord): UserSummary {
    return {
      id: record.get('id'),
      email: record.get('email'),
      name: record.get('name'),
      provider: record.get('provider'),
      role: record.get('role') || 'user',
      avatarUrl: record.get('avatarUrl'),
      lastLogin: record.get('lastLogin')?.toString() || null,
      createdAt: record.get('createdAt')?.toString() || null,
      teamCount: record.get('teamCount').toNumber()
    }
  }
}
