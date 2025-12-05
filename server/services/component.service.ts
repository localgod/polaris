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
   * Get all components with optional filtering and pagination
   * 
   * Business rules:
   * - Default limit is 50 components per page
   * - Search is case-insensitive
   * - Returns total count for pagination
   * 
   * @param filters - Optional filters to apply
   * @returns Array of components with count and total
   */
  async findAll(filters: ComponentFilters = {}): Promise<{ 
    data: Component[]
    count: number
    total: number 
  }> {
    // Set defaults
    const limit = filters.limit !== undefined ? filters.limit : 50
    const offset = filters.offset || 0
    
    // Apply filters with pagination
    const filtersWithPagination = {
      ...filters,
      limit,
      offset
    }
    
    // Get filtered components
    const components = await this.componentRepo.findAll(filtersWithPagination)
    
    // Get total count (without pagination)
    const total = await this.componentRepo.count(filters)
    
    return {
      data: components,
      count: components.length,
      total
    }
  }

  /**
   * Get all unmapped components
   * 
   * Retrieves components not mapped to a known technology, ordered by
   * system count to help prioritize mapping efforts.
   * 
   * Use cases:
   * - Identify components that need technology mapping
   * - Find widely-used internal libraries
   * - Discover shadow IT or unapproved dependencies
   * 
   * @returns Array of unmapped components with count
   */
  async findUnmapped(): Promise<{ data: UnmappedComponent[]; count: number }> {
    const components = await this.componentRepo.findUnmapped()
    
    return {
      data: components,
      count: components.length
    }
  }
}
