import { ComponentRepository } from '../repositories/component.repository'
import type { Component, UnmappedComponent } from '~~/types/api'

/**
 * Service for component-related business logic
 */
export class ComponentService {
  private componentRepo: ComponentRepository

  constructor() {
    this.componentRepo = new ComponentRepository()
  }

  /**
   * Get all components
   * 
   * @returns Array of components with count
   */
  async findAll(): Promise<{ data: Component[]; count: number }> {
    const components = await this.componentRepo.findAll()
    
    return {
      data: components,
      count: components.length
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
