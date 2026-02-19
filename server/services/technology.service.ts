import { TechnologyRepository, type TechnologyDetail, type CreateTechnologyParams, type UpdateTechnologyParams, type UpsertApprovalParams } from '../repositories/technology.repository'
import type { Technology } from '~~/types/api'
import type { SortParams } from '../utils/sorting'

const VALID_CATEGORIES = ['language', 'framework', 'library', 'database', 'cache', 'container', 'platform', 'tool', 'runtime', 'other']

export interface SetApprovalInput {
  technologyName: string
  teamName: string
  time: string
  versionConstraint?: string
  notes?: string
  userId: string
}

export interface CreateTechnologyInput {
  name: string
  category: string
  vendor?: string
  ownerTeam?: string
  componentName?: string
  componentPackageManager?: string
  userId: string
}

export interface UpdateTechnologyInput {
  name: string
  category: string
  vendor?: string
  ownerTeam?: string
  lastReviewed?: string
  userId: string
}

/**
 * Service for technology-related business logic
 */
export class TechnologyService {
  private techRepo: TechnologyRepository

  constructor() {
    this.techRepo = new TechnologyRepository()
  }

  /**
   * Get all technologies with their versions and approvals
   * 
   * @returns Array of technologies with count
   */
  async findAll(sort?: SortParams): Promise<{ data: Technology[]; count: number }> {
    const technologies = await this.techRepo.findAll(sort)
    
    return {
      data: technologies,
      count: technologies.length
    }
  }

  /**
   * Get a technology by name with detailed information
   * 
   * Includes versions, components, systems, policies, and approvals.
   * 
   * @param name - Technology name
   * @returns Technology detail or null if not found
   */
  async findByName(name: string): Promise<TechnologyDetail | null> {
    return await this.techRepo.findByName(name)
  }

  /**
   * Create a new technology, optionally linking a source component
   * 
   * @param input - Technology creation input
   * @returns Created technology name
   */
  async create(input: CreateTechnologyInput): Promise<string> {
    if (!input.name || !input.category) {
      throw createError({
        statusCode: 400,
        message: 'Name and category are required'
      })
    }

    if (!VALID_CATEGORIES.includes(input.category)) {
      throw createError({
        statusCode: 422,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      })
    }

    const exists = await this.techRepo.exists(input.name)
    if (exists) {
      throw createError({
        statusCode: 409,
        message: `A technology with the name '${input.name}' already exists`
      })
    }

    const params: CreateTechnologyParams = {
      name: input.name,
      category: input.category,
      vendor: input.vendor || null,
      ownerTeam: input.ownerTeam || null,
      componentName: input.componentName || null,
      componentPackageManager: input.componentPackageManager || null,
      userId: input.userId
    }

    return await this.techRepo.create(params)
  }

  /**
   * Find the owner team of a technology
   *
   * @param name - Technology name
   * @returns Technology name and owner team, or null if not found
   */
  async findOwnerTeam(name: string): Promise<{ name: string; ownerTeam: string | null } | null> {
    return await this.techRepo.findOwnerTeam(name)
  }

  /**
   * Delete a technology
   *
   * @param name - Technology name
   * @param userId - ID of the user performing the deletion
   * @throws 404 if technology not found
   */
  async delete(name: string, userId: string): Promise<void> {
    const exists = await this.techRepo.exists(name)

    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Technology '${name}' not found`
      })
    }

    await this.techRepo.delete(name, userId)
  }

  /**
   * Update a technology's properties and ownership
   */
  async update(input: UpdateTechnologyInput): Promise<string> {
    if (!input.category) {
      throw createError({
        statusCode: 400,
        message: 'Category is required'
      })
    }

    if (!VALID_CATEGORIES.includes(input.category)) {
      throw createError({
        statusCode: 422,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      })
    }

    const exists = await this.techRepo.exists(input.name)
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Technology '${input.name}' not found`
      })
    }

    const params: UpdateTechnologyParams = {
      name: input.name,
      category: input.category,
      vendor: input.vendor || null,
      ownerTeam: input.ownerTeam || null,
      lastReviewed: input.lastReviewed || null,
      userId: input.userId
    }

    return await this.techRepo.update(params)
  }

  /**
   * Set or update a team's TIME approval for a technology
   */
  async setApproval(input: SetApprovalInput): Promise<{ time: string; team: string }> {
    const validTimeValues = ['tolerate', 'invest', 'migrate', 'eliminate']
    if (!validTimeValues.includes(input.time)) {
      throw createError({
        statusCode: 422,
        message: `Invalid TIME value. Must be one of: ${validTimeValues.join(', ')}`
      })
    }

    const exists = await this.techRepo.exists(input.technologyName)
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Technology '${input.technologyName}' not found`
      })
    }

    const params: UpsertApprovalParams = {
      technologyName: input.technologyName,
      teamName: input.teamName,
      time: input.time,
      approvedBy: input.userId,
      versionConstraint: input.versionConstraint || null,
      notes: input.notes || null,
      userId: input.userId
    }

    return await this.techRepo.upsertApproval(params)
  }
}
