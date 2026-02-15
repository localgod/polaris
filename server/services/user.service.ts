import { UserRepository, type User, type UserSummary, type AssignTeamsParams, type CreateOrUpdateUserParams, type UserAuthData } from '../repositories/user.repository'
import type { SortParams } from '../utils/sorting'

/**
 * Service for user-related business logic
 */
export class UserService {
  private userRepo: UserRepository

  constructor() {
    this.userRepo = new UserRepository()
  }

  /**
   * Get user authentication data for JWT token
   * 
   * Business rules:
   * - Returns role and team memberships for session
   * - Used during JWT token refresh
   * 
   * @param userId - User ID
   * @returns User auth data or null if not found
   */
  async getAuthData(userId: string): Promise<UserAuthData | null> {
    return await this.userRepo.getAuthData(userId)
  }

  /**
   * Create or update user on sign in
   * 
   * Business rules:
   * - Determines superuser status from environment variable
   * - Preserves existing superuser role
   * - Updates user data on every sign in
   * 
   * @param params - User creation/update parameters
   */
  async createOrUpdateUser(params: CreateOrUpdateUserParams): Promise<void> {
    await this.userRepo.createOrUpdateUser(params)
  }

  /**
   * Get all users with their team memberships
   * 
   * Retrieves all users with their team memberships and management permissions.
   * Results are ordered by creation date (newest first).
   * 
   * Use cases:
   * - Admin user management interface
   * - User directory
   * - Team membership auditing
   * 
   * @returns Array of users with count
   */
  async findAll(): Promise<{ data: User[]; count: number }> {
    const users = await this.userRepo.findAll()
    
    return {
      data: users,
      count: users.length
    }
  }

  /**
   * Get all users with team counts (summary view)
   * 
   * Retrieves all users with just their team counts, without full team details.
   * Results are ordered by creation date (newest first).
   * 
   * Use cases:
   * - User listing pages
   * - Quick user overview
   * 
   * @returns Array of user summaries
   */
  async findAllSummary(sort?: SortParams): Promise<UserSummary[]> {
    return await this.userRepo.findAllSummary(sort)
  }

  /**
   * Assign user to teams
   * 
   * Replaces existing team memberships with new ones and optionally
   * grants team management permissions.
   * 
   * Business rules:
   * - All existing memberships are removed first
   * - User must exist in the database
   * - Teams must exist in the database (enforced by Cypher MATCH)
   * - Management permissions are optional
   * 
   * @param params - Assignment parameters
   * @returns Updated user
   * @throws Error if user not found
   */
  async assignTeams(params: AssignTeamsParams): Promise<User> {
    return await this.userRepo.assignTeams(params)
  }

  /**
   * Get user by ID
   * 
   * @param userId - User ID
   * @returns User or null if not found
   */
  async findById(userId: string): Promise<User | null> {
    return await this.userRepo.findById(userId)
  }
}
