import { TechnologyRepository, type TechnologyDetail } from '../repositories/technology.repository'
import type { Technology } from '~~/types/api'

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
  async findAll(): Promise<{ data: Technology[]; count: number }> {
    const technologies = await this.techRepo.findAll()
    
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
}
