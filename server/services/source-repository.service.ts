import { SourceRepositoryRepository } from '../repositories/source-repository.repository'
import type { Repository } from '~~/types/api'

/**
 * Service for source code repository-related business logic
 */
export class SourceRepositoryService {
  private sourceRepoRepo: SourceRepositoryRepository

  constructor() {
    this.sourceRepoRepo = new SourceRepositoryRepository()
  }

  /**
   * Get all repositories
   * 
   * @returns Array of repositories with count
   */
  async findAll(): Promise<{ data: Repository[]; count: number }> {
    const repositories = await this.sourceRepoRepo.findAll()
    
    return {
      data: repositories,
      count: repositories.length
    }
  }
}
