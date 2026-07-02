import { ComponentRepository } from '../repositories/component.repository'
import type { ComponentDependencyFilters, ComponentDependencyTree, ComponentFilters, LinkSuggestion } from '../repositories/component.repository'
import type { Component, ComponentDetail, GroupedComponent } from '~~/types/api'
import type { ComponentIdentity } from '~~/utils/component-identity'

export type { ComponentFilters, LinkSuggestion }

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

  async findAllGrouped(filters: ComponentFilters = {}): Promise<{
    data: GroupedComponent[]
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

    const { data, total } = await this.componentRepo.findAllGrouped(filtersWithPagination)

    return {
      data,
      count: data.length,
      total
    }
  }

  async findByIdentity(identity: ComponentIdentity): Promise<ComponentDetail | null> {
    return await this.componentRepo.findByIdentity(identity)
  }

  async findDependencies(
    identity: ComponentIdentity,
    filters: ComponentDependencyFilters
  ): Promise<ComponentDependencyTree | null> {
    return await this.componentRepo.findDependencies(identity, filters)
  }

  async getLinkSuggestions(skip: number, limit: number): Promise<{ data: LinkSuggestion[]; count: number; total: number }> {
    const { data, total } = await this.componentRepo.getLinkSuggestions(skip, limit)
    return { data, count: data.length, total }
  }

  async dismissLink(componentName: string): Promise<void> {
    await this.componentRepo.dismissLink(componentName)
  }

}
