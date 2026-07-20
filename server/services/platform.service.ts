import { PlatformRepository, type PlatformDetail, type CreatePlatformParams, type UpdatePlatformParams, type UpsertPlatformApprovalParams } from '../repositories/platform.repository'
import type { Platform, ComponentType, TechnologyDomain, TimeValue } from '~~/types/api'
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

export interface SetPlatformApprovalInput {
  platformName: string
  teamName: string
  time: string
  notes?: string
  environment?: string | null
  userId: string
  realUserId?: string | null
  correlationId?: string | null
}

export interface CreatePlatformInput {
  name: string
  type: string
  domain?: string
  vendor?: string
  stewardTeam?: string
  userId: string
  realUserId?: string | null
}

export interface UpdatePlatformInput {
  name: string
  type: string
  domain?: string
  vendor?: string
  stewardTeam?: string
  userId: string
  realUserId?: string | null
}

/**
 * Service for platform-related business logic.
 *
 * A Platform is manually-declared, non-SBOM-observable technology (databases,
 * cloud services, container runtimes) — the deliberate "no evidence required"
 * counterpart to Technology, which requires a linked Component. See
 * docs/architecture/decisions/0004-technology-requires-component.md.
 */
export class PlatformService {
  constructor(
    private readonly platformRepo = new PlatformRepository()
  ) {
  }

  /**
   * Get all platforms with their approvals
   */
  async findAll(sort?: SortParams, limit = 50, offset = 0, search?: string): Promise<{ data: Platform[]; count: number; total: number }> {
    const { data, total } = await this.platformRepo.findAll(sort, limit, offset, search)
    return { data, count: data.length, total }
  }

  /**
   * Get a platform by name with detailed information
   */
  async findByName(name: string): Promise<PlatformDetail | null> {
    return await this.platformRepo.findByName(name)
  }

  /**
   * Create a new platform. Unlike Technology, this never requires or accepts
   * a Component — Platform exists specifically for things SBOM scanning can't see.
   */
  async create(input: CreatePlatformInput): Promise<string> {
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

    const exists = await this.platformRepo.exists(input.name)
    if (exists) {
      throw createError({
        statusCode: 409,
        message: `A platform with the name '${input.name}' already exists`
      })
    }

    const params: CreatePlatformParams = {
      name: input.name,
      type: input.type,
      domain: input.domain?.trim() || null,
      vendor: input.vendor?.trim() || null,
      stewardTeam: input.stewardTeam?.trim() || null,
      userId: input.userId,
      realUserId: input.realUserId ?? null
    }

    return await this.platformRepo.create(params)
  }

  /**
   * Find the steward team of a platform
   */
  async findStewardTeam(name: string): Promise<{ name: string; stewardTeam: string | null } | null> {
    return await this.platformRepo.findStewardTeam(name)
  }

  /**
   * Delete a platform
   */
  async delete(name: string, userId: string, realUserId?: string | null): Promise<void> {
    const platform = await this.platformRepo.findByName(name)

    if (!platform) {
      throw createError({
        statusCode: 404,
        message: `Platform '${name}' not found`
      })
    }

    const changes = buildDeleteChanges({
      name: platform.name,
      type: platform.type,
      domain: platform.domain ?? null,
      vendor: platform.vendor ?? null,
      stewardTeam: platform.stewardTeamName ?? null,
    })

    await this.platformRepo.delete(name, userId, changes, realUserId)
  }

  /**
   * Update a platform's properties and stewardship
   */
  async update(input: UpdatePlatformInput): Promise<string> {
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

    const current = await this.platformRepo.findByName(input.name)
    if (!current) {
      throw createError({
        statusCode: 404,
        message: `Platform '${input.name}' not found`
      })
    }

    const allFields = ['type', 'domain', 'vendor', 'stewardTeam']
    const before: Record<string, unknown> = {
      type: current.type ?? null,
      domain: current.domain ?? null,
      vendor: current.vendor ?? null,
      stewardTeam: current.stewardTeamName ?? null,
    }
    const after: Record<string, unknown> = {
      type: input.type,
      domain: input.domain?.trim() || null,
      vendor: input.vendor?.trim() || null,
      stewardTeam: input.stewardTeam?.trim() || null,
    }
    const changes = buildAuditChanges(before, after, allFields)

    const params: UpdatePlatformParams = {
      name: input.name,
      type: input.type,
      domain: input.domain?.trim() || null,
      vendor: input.vendor?.trim() || null,
      stewardTeam: input.stewardTeam?.trim() || null,
      userId: input.userId,
      realUserId: input.realUserId ?? null
    }

    return await this.platformRepo.update({ ...params, changes })
  }

  /**
   * Set or update a team's TIME approval for a platform
   */
  async setApproval(input: SetPlatformApprovalInput): Promise<{ time: string; team: string }> {
    if (!VALID_TIME_VALUES.includes(input.time as TimeValue)) {
      throw createError({
        statusCode: 422,
        message: `Invalid TIME value. Must be one of: ${VALID_TIME_VALUES.join(', ')}`
      })
    }

    const VALID_ENVIRONMENTS = ['dev', 'test', 'staging', 'prod']
    if (input.environment && !VALID_ENVIRONMENTS.includes(input.environment)) {
      throw createError({
        statusCode: 422,
        message: `Invalid environment. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`
      })
    }

    const exists = await this.platformRepo.exists(input.platformName)
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Platform '${input.platformName}' not found`
      })
    }

    const environment = input.environment ?? null

    const existing = await this.platformRepo.findExistingApproval(input.platformName, input.teamName, environment)
    const before: Record<string, unknown> = {
      time: existing?.time ?? null,
      notes: existing?.notes ?? null,
    }
    const after: Record<string, unknown> = {
      time: input.time,
      notes: input.notes ?? null,
    }
    const changes = buildAuditChanges(before, after, ['time', 'notes'])
    changes.team = { before: input.teamName, after: input.teamName }
    changes.environment = { before: environment, after: environment }

    const params: UpsertPlatformApprovalParams = {
      platformName: input.platformName,
      teamName: input.teamName,
      time: input.time,
      notes: input.notes?.trim() || null,
      environment,
      userId: input.userId,
      realUserId: input.realUserId ?? null,
      correlationId: input.correlationId ?? null
    }

    return await this.platformRepo.upsertApproval({ ...params, changes })
  }
}
