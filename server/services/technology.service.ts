import { TechnologyRepository, type TechnologyDetail, type CreateTechnologyParams, type UpdateTechnologyParams, type UpsertApprovalParams } from '../repositories/technology.repository'
import type { Technology, ComponentType, TechnologyDomain, TimeValue } from '~~/types/api'
import type { SortParams } from '../utils/sorting'
import { buildAuditChanges, buildDeleteChanges } from '../utils/audit-diff'

const VALID_TYPES = [
  'application', 'framework', 'library', 'container', 'platform',
  'operating-system', 'device', 'device-driver', 'firmware',
  'file', 'machine-learning-model', 'data'
] as const satisfies ComponentType[]

const VALID_DOMAINS = [
  'foundational-runtime', 'framework', 'data-platform',
  'integration-platform', 'security-identity', 'infrastructure',
  'observability', 'developer-tooling', 'other'
] as const satisfies TechnologyDomain[]

const VALID_TIME_VALUES = [
  'tolerate', 'invest', 'migrate', 'eliminate'
] as const satisfies TimeValue[]

export interface SetApprovalInput {
  technologyName: string
  teamName: string
  time: string
  notes?: string
  userId: string
}

export interface CreateTechnologyInput {
  name: string
  type: string
  domain?: string
  vendor?: string
  ownerTeam?: string
  componentName?: string
  componentPackageManager?: string
  userId: string
}

export interface UpdateTechnologyInput {
  name: string
  type: string
  domain?: string
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
  async findAll(sort?: SortParams, limit = 50, offset = 0): Promise<{ data: Technology[]; count: number; total: number }> {
    const { data, total } = await this.techRepo.findAll(sort, limit, offset)
    return { data, count: data.length, total }
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
    if (!input.name || !input.type) {
      throw createError({
        statusCode: 400,
        message: 'Name and type are required'
      })
    }

    if (!VALID_TYPES.includes(input.type as ComponentType)) {
      throw createError({
        statusCode: 422,
        message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
      })
    }

    if (input.domain && !VALID_DOMAINS.includes(input.domain as TechnologyDomain)) {
      throw createError({
        statusCode: 422,
        message: `Invalid domain. Must be one of: ${VALID_DOMAINS.join(', ')}`
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
      type: input.type,
      domain: input.domain || null,
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
    const tech = await this.techRepo.findByName(name)

    if (!tech) {
      throw createError({
        statusCode: 404,
        message: `Technology '${name}' not found`
      })
    }

    const changes = buildDeleteChanges({
      name: tech.name,
      type: tech.type,
      domain: tech.domain ?? null,
      vendor: tech.vendor ?? null,
      ownerTeam: tech.ownerTeamName ?? null,
    })

    await this.techRepo.delete(name, userId, changes)
  }

  /**
   * Update a technology's properties and ownership
   */
  async update(input: UpdateTechnologyInput): Promise<string> {
    if (!input.type) {
      throw createError({
        statusCode: 400,
        message: 'Type is required'
      })
    }

    if (!VALID_TYPES.includes(input.type as ComponentType)) {
      throw createError({
        statusCode: 422,
        message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
      })
    }

    if (input.domain && !VALID_DOMAINS.includes(input.domain as TechnologyDomain)) {
      throw createError({
        statusCode: 422,
        message: `Invalid domain. Must be one of: ${VALID_DOMAINS.join(', ')}`
      })
    }

    const current = await this.techRepo.findByName(input.name)
    if (!current) {
      throw createError({
        statusCode: 404,
        message: `Technology '${input.name}' not found`
      })
    }

    const allFields = ['type', 'domain', 'vendor', 'ownerTeam', 'lastReviewed']
    const before: Record<string, unknown> = {
      type: current.type ?? null,
      domain: current.domain ?? null,
      vendor: current.vendor ?? null,
      ownerTeam: current.ownerTeamName ?? null,
      lastReviewed: current.lastReviewed ?? null,
    }
    const after: Record<string, unknown> = {
      type: input.type,
      domain: input.domain || null,
      vendor: input.vendor || null,
      ownerTeam: input.ownerTeam || null,
      lastReviewed: input.lastReviewed || null,
    }
    const changes = buildAuditChanges(before, after, allFields)

    const params: UpdateTechnologyParams = {
      name: input.name,
      type: input.type,
      domain: input.domain || null,
      vendor: input.vendor || null,
      ownerTeam: input.ownerTeam || null,
      lastReviewed: input.lastReviewed || null,
      userId: input.userId
    }

    return await this.techRepo.update({ ...params, changes })
  }

  /**
   * Link a component to a technology via IS_VERSION_OF
   */
  async linkComponent(input: { technologyName: string; componentName: string; componentVersion: string; userId: string }) {
    const exists = await this.techRepo.exists(input.technologyName)
    if (!exists) {
      throw createError({ statusCode: 404, message: `Technology '${input.technologyName}' not found` })
    }
    return await this.techRepo.linkComponent(input)
  }

  /**
   * Set or update a team's TIME approval for a technology
   */
  async setApproval(input: SetApprovalInput): Promise<{ time: string; team: string }> {
    if (!VALID_TIME_VALUES.includes(input.time as TimeValue)) {
      throw createError({
        statusCode: 422,
        message: `Invalid TIME value. Must be one of: ${VALID_TIME_VALUES.join(', ')}`
      })
    }

    const exists = await this.techRepo.exists(input.technologyName)
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Technology '${input.technologyName}' not found`
      })
    }

    // Fetch existing approval for this team to compute the diff
    const existing = await this.techRepo.findExistingApproval(input.technologyName, input.teamName)
    const before: Record<string, unknown> = {
      time: existing?.time ?? null,
      notes: existing?.notes ?? null,
    }
    const after: Record<string, unknown> = {
      time: input.time,
      notes: input.notes ?? null,
    }
    const changes = buildAuditChanges(before, after, ['time', 'notes'])

    const params: UpsertApprovalParams = {
      technologyName: input.technologyName,
      teamName: input.teamName,
      time: input.time,
      notes: input.notes || null,
      userId: input.userId
    }

    return await this.techRepo.upsertApproval({ ...params, changes })
  }
}
