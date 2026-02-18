import { TeamRepository } from '../repositories/team.repository'
import type { Team, TeamApprovalsResult, TeamPoliciesResult, TeamUsageResult, ApprovalStatus } from '../repositories/team.repository'
import type { SortParams } from '../utils/sorting'

/**
 * Service for team-related business logic
 */
export class TeamService {
  private teamRepo: TeamRepository

  constructor() {
    this.teamRepo = new TeamRepository()
  }

  /**
   * Get all teams
   * 
   * @returns Array of teams with count
   */
  async findAll(sort?: SortParams): Promise<{ data: Team[]; count: number }> {
    const teams = await this.teamRepo.findAll(sort)
    
    return {
      data: teams,
      count: teams.length
    }
  }

  /**
   * Create a new team
   *
   * Business rules:
   * - Team name must be unique
   * - Team name is required
   *
   * @param input - Team creation input
   * @returns Created team name
   * @throws Error if team already exists or validation fails
   */
  async create(input: {
    name: string
    email?: string | null
    responsibilityArea?: string | null
    userId: string
  }): Promise<string> {
    if (!input.name) {
      throw createError({
        statusCode: 400,
        message: 'Team name is required'
      })
    }

    const exists = await this.teamRepo.exists(input.name)
    if (exists) {
      throw createError({
        statusCode: 409,
        message: `A team with the name '${input.name}' already exists`
      })
    }

    return await this.teamRepo.create({
      name: input.name,
      email: input.email || null,
      responsibilityArea: input.responsibilityArea || null,
      userId: input.userId
    })
  }

  /**
   * Get a team by name
   * 
   * @param name - Team name
   * @returns Team or null if not found
   */
  async findByName(name: string): Promise<Team | null> {
    return await this.teamRepo.findByName(name)
  }

  /**
   * Update a team
   *
   * Business rules:
   * - Team must exist
   * - At least one field must be provided
   *
   * @param input - Team update input
   * @returns Updated team name
   * @throws Error if team not found or no fields provided
   */
  async update(input: {
    name: string
    newName?: string
    email?: string | null
    responsibilityArea?: string | null
    userId: string
  }): Promise<string> {
    const exists = await this.teamRepo.exists(input.name)
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Team '${input.name}' not found`
      })
    }

    const changedFields: string[] = []
    const newName = input.newName || input.name

    if (input.newName && input.newName !== input.name) {
      const nameConflict = await this.teamRepo.exists(input.newName)
      if (nameConflict) {
        throw createError({
          statusCode: 409,
          message: `A team with the name '${input.newName}' already exists`
        })
      }
      changedFields.push('name')
    }
    if (input.email !== undefined) changedFields.push('email')
    if (input.responsibilityArea !== undefined) changedFields.push('responsibilityArea')

    if (changedFields.length === 0) {
      throw createError({
        statusCode: 422,
        message: 'At least one field to update is required'
      })
    }

    return await this.teamRepo.update({
      name: input.name,
      newName,
      email: input.email ?? null,
      responsibilityArea: input.responsibilityArea ?? null,
      changedFields,
      userId: input.userId
    })
  }

  /**
   * Delete a team
   * 
   * Business rules:
   * - Team must exist before deletion
   * - Team cannot own any systems (must be reassigned first)
   * - All relationships are automatically removed (DETACH DELETE)
   * 
   * @param name - Team name
   * @throws Error if team not found or owns systems
   */
  async delete(name: string, userId: string): Promise<void> {
    // Business logic: check if team exists
    const exists = await this.teamRepo.exists(name)
    
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Team '${name}' not found`
      })
    }
    
    // Business logic: check if team owns any systems
    const systemCount = await this.teamRepo.countOwnedSystems(name)
    
    if (systemCount > 0) {
      throw createError({
        statusCode: 409,
        message: `Cannot delete team '${name}' because it owns ${systemCount} system(s). Please reassign or delete the systems first.`
      })
    }
    
    // Delete the team
    await this.teamRepo.delete(name, userId)
  }

  /**
   * Get team approvals
   * 
   * Business rules:
   * - Team must exist
   * 
   * @param name - Team name
   * @returns Team approvals result
   * @throws Error if team not found
   */
  async findApprovals(name: string): Promise<TeamApprovalsResult> {
    try {
      return await this.teamRepo.findApprovals(name)
    } catch (error) {
      throw createError({
        statusCode: 404,
        message: error instanceof Error ? error.message : `Team '${name}' not found`
      })
    }
  }

  /**
   * Get team policies
   * 
   * @param teamName - Team name
   * @returns Team policies result
   */
  async findPolicies(teamName: string): Promise<TeamPoliciesResult> {
    return await this.teamRepo.findPolicies(teamName)
  }

  /**
   * Get team technology usage
   * 
   * @param teamName - Team name
   * @returns Team usage result
   */
  async findUsage(teamName: string): Promise<TeamUsageResult> {
    return await this.teamRepo.findUsage(teamName)
  }

  /**
   * Check approval status for a technology
   * 
   * Business rules:
   * - Team and technology must exist
   * - Approval hierarchy: version > technology > default (eliminate)
   * 
   * @param team - Team name
   * @param technology - Technology name
   * @param version - Optional version
   * @returns Approval status
   * @throws Error if team or technology not found
   */
  async checkApproval(team: string, technology: string, version?: string): Promise<ApprovalStatus> {
    const result = await this.teamRepo.checkApproval(team, technology, version)
    
    if (!result) {
      throw createError({
        statusCode: 404,
        message: `Team '${team}' or technology '${technology}' not found`
      })
    }
    
    return result
  }
}
