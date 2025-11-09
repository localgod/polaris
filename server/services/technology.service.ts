import { TechnologyRepository } from '../repositories/technology.repository'
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
}
