import { SystemRepository } from '../repositories/system.repository'
import type { System, CreateSystemParams, RepositoryInput, UnmappedComponentsResult } from '../repositories/system.repository'
import { normalizeRepoUrl } from '../utils/repository'

export interface CreateSystemInput {
  name: string
  domain: string
  ownerTeam: string
  businessCriticality: string
  environment: string
  sourceCodeType?: string
  hasSourceAccess?: boolean
  repositories?: RepositoryInput[]
}

/**
 * Service for system-related business logic
 */
export class SystemService {
  private systemRepo: SystemRepository

  constructor() {
    this.systemRepo = new SystemRepository()
  }

  /**
   * Get all systems
   * 
   * @returns Array of systems with count
   */
  async findAll(): Promise<{ data: System[]; count: number }> {
    const systems = await this.systemRepo.findAll()
    
    return {
      data: systems,
      count: systems.length
    }
  }

  /**
   * Get a system by name
   * 
   * @param name - System name
   * @returns System or null if not found
   */
  async findByName(name: string): Promise<System | null> {
    return await this.systemRepo.findByName(name)
  }

  /**
   * Create a new system
   * 
   * Business rules:
   * - System name must be unique
   * - Business criticality must be valid (critical, high, medium, low)
   * - Environment must be valid (dev, test, staging, prod)
   * - Source code properties are derived from repositories
   * - Repository URLs are normalized
   * 
   * @param input - System creation input
   * @returns Created system name
   * @throws Error if system already exists or validation fails
   */
  async create(input: CreateSystemInput): Promise<string> {
    // Business logic: validate required fields
    if (!input.name || !input.domain || !input.ownerTeam || !input.businessCriticality || !input.environment) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }

    // Business logic: validate businessCriticality
    const validCriticalities = ['critical', 'high', 'medium', 'low']
    if (!validCriticalities.includes(input.businessCriticality)) {
      throw createError({
        statusCode: 422,
        message: 'Invalid business criticality value. Must be one of: critical, high, medium, low'
      })
    }

    // Business logic: validate environment
    const validEnvironments = ['dev', 'test', 'staging', 'prod']
    if (!validEnvironments.includes(input.environment)) {
      throw createError({
        statusCode: 422,
        message: 'Invalid environment value. Must be one of: dev, test, staging, prod'
      })
    }

    // Business logic: check if system already exists
    const exists = await this.systemRepo.exists(input.name)
    if (exists) {
      throw createError({
        statusCode: 409,
        message: `A system with the name '${input.name}' already exists`
      })
    }

    // Business logic: derive source code properties from repositories
    const hasRepositories = input.repositories && input.repositories.length > 0
    const hasSourceAccess = Boolean(hasRepositories)
    const sourceCodeType = hasRepositories
      ? (input.repositories!.some(r => r.isPublic) ? 'open-source' : 'proprietary')
      : 'unknown'

    // Business logic: normalize repository URLs
    const repositories = (input.repositories || []).map(repo => ({
      ...repo,
      url: normalizeRepoUrl(repo.url)
    }))

    // Create the system
    const params: CreateSystemParams = {
      name: input.name,
      domain: input.domain,
      ownerTeam: input.ownerTeam,
      businessCriticality: input.businessCriticality,
      environment: input.environment,
      sourceCodeType,
      hasSourceAccess,
      repositories
    }

    return await this.systemRepo.create(params)
  }

  /**
   * Delete a system
   * 
   * Business rules:
   * - System must exist before deletion
   * - All relationships are automatically removed (DETACH DELETE)
   * 
   * @param name - System name
   * @throws Error if system not found
   */
  async delete(name: string): Promise<void> {
    // Business logic: check if system exists
    const exists = await this.systemRepo.exists(name)
    
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `System '${name}' not found`
      })
    }
    
    // Delete the system
    await this.systemRepo.delete(name)
  }

  /**
   * Get unmapped components for a system
   * 
   * Business rules:
   * - System must exist
   * 
   * @param systemName - System name
   * @returns Unmapped components result
   * @throws Error if system not found
   */
  async findUnmappedComponents(systemName: string): Promise<UnmappedComponentsResult> {
    // Business logic: check if system exists
    const exists = await this.systemRepo.exists(systemName)
    
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `System '${systemName}' not found`
      })
    }
    
    return await this.systemRepo.findUnmappedComponents(systemName)
  }
}
