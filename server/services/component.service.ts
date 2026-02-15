import { ComponentRepository } from '../repositories/component.repository'
import type { ComponentFilters } from '../repositories/component.repository'
import type { Component, UnmappedComponent } from '~~/types/api'

export type { ComponentFilters }

/**
 * Service for component-related business logic
 */
export class ComponentService {
  private componentRepo: ComponentRepository

  constructor() {
    this.componentRepo = new ComponentRepository()
  }

  /**
   * Get all components with optional filtering and pagination.
   *
   * Data and total count are fetched in a single database query.
   */
  async findAll(filters: ComponentFilters = {}): Promise<{ 
    data: Component[]
    count: number
    total: number 
  }> {
    const limit = filters.limit !== undefined ? filters.limit : 50
    const offset = filters.offset || 0
    
    const filtersWithPagination = {
      ...filters,
      limit,
      offset
    }
    
    const { data, total } = await this.componentRepo.findAll(filtersWithPagination)
    
    return {
      data,
      count: data.length,
      total
    }
  }

  /**
   * Get unmapped components with pagination.
   *
   * Retrieves components not mapped to a known technology, ordered by
   * system count to help prioritize mapping efforts.
   */
  async findUnmapped(limit: number = 50, offset: number = 0, sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<{
    data: UnmappedComponent[]
    count: number
    total: number
  }> {
    const components = await this.componentRepo.findUnmapped(limit, offset, sort)
    const total = await this.componentRepo.countUnmapped()
    
    return {
      data: components,
      count: components.length,
      total
    }
  }
}
