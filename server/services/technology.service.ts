import { TechnologyRepository, type TechnologyDetail, type CreateTechnologyFromComponentParams, type UpdateTechnologyParams, type UpsertApprovalParams } from '../repositories/technology.repository'
import { SBOMRepository } from '../repositories/sbom.repository'
import type { EOLStatus, EOLStatusValue, Technology, ComponentType, TechnologyDomain, TimeValue, TechnologyLifecycleSummary, TechnologyVersionLifecycle } from '~~/types/api'
import type { SortParams } from '../utils/sorting'
import { buildAuditChanges, buildDeleteChanges } from '../utils/audit-diff'
import { logger } from '../utils/logger'
import { EOLService } from './eol.service'

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
  environment?: string | null
  userId: string
  realUserId?: string | null
  correlationId?: string | null
}

export interface CreateTechnologyFromComponentInput {
  name: string
  type: string
  domain?: string
  vendor?: string
  ownerTeam?: string
  componentName: string
  userId: string
  realUserId?: string | null
}

export interface UpdateTechnologyInput {
  name: string
  type: string
  domain?: string
  vendor?: string
  ownerTeam?: string
  lastReviewed?: string
  userId: string
  realUserId?: string | null
}

/**
 * Service for technology-related business logic
 */
export class TechnologyService {
  constructor(
    private readonly techRepo = new TechnologyRepository(),
    private readonly eolService = new EOLService(),
    private readonly sbomRepo = new SBOMRepository()
  ) {
  }

  /**
   * Get all technologies with their versions and approvals
   * 
   * @returns Array of technologies with count
   */
  async findAll(sort?: SortParams, limit = 50, offset = 0, search?: string): Promise<{ data: Technology[]; count: number; total: number }> {
    const { data, total } = await this.techRepo.findAll(sort, limit, offset, search)
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
    const technology = await this.techRepo.findByName(name)
    if (!technology) return null

    const versionRows = Array.isArray(technology.versions) ? technology.versions : []
    const versionLifecycles = await Promise.all(versionRows.map(async (versionRow) => {
      const version = typeof versionRow === 'string' ? versionRow : versionRow.version
      const storedEolDate = typeof versionRow === 'string' ? null : versionRow.eolDate ?? null
      const lifecycle = await this.eolService.getEOLStatus({
        name,
        version,
        technologyName: name
      })

      return {
        version,
        storedEolDate,
        lifecycle
      }
    }))

    return {
      ...technology,
      versionLifecycles,
      lifecycleSummary: this.summarizeLifecycle(versionLifecycles)
    }
  }

  private summarizeLifecycle(versionLifecycles: TechnologyVersionLifecycle[]): TechnologyLifecycleSummary {
    const counts: Record<EOLStatusValue, number> = {
      active: 0,
      approaching_eol: 0,
      unsupported: 0,
      unknown: 0
    }

    for (const item of versionLifecycles) {
      counts[item.lifecycle.status] += 1
    }

    return {
      status: this.worstStatus(versionLifecycles.map(item => item.lifecycle)),
      unsupportedCount: counts.unsupported,
      approachingCount: counts.approaching_eol,
      activeCount: counts.active,
      unknownCount: counts.unknown
    }
  }

  private worstStatus(statuses: EOLStatus[]): EOLStatusValue {
    if (statuses.some(status => status.status === 'unsupported')) return 'unsupported'
    if (statuses.some(status => status.status === 'approaching_eol')) return 'approaching_eol'
    if (statuses.some(status => status.status === 'active')) return 'active'
    return 'unknown'
  }

  /**
   * Create a new technology by claiming an existing, currently-unlinked
   * Component. A Technology can never exist without at least one linked
   * Component — see docs/architecture/decisions/0004-technology-requires-component.md.
   * Manually-declared, non-SBOM-observable technology belongs in Platform instead.
   *
   * @param input - Technology creation input
   * @returns Created technology name
   */
  async createFromComponent(input: CreateTechnologyFromComponentInput): Promise<string> {
    if (!input.name || !input.type) {
      throw createError({
        statusCode: 400,
        message: 'Name and type are required'
      })
    }

    if (!input.componentName?.trim()) {
      throw createError({
        statusCode: 400,
        message: 'componentName is required — a Technology must be created from an existing, unlinked Component'
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

    const params: CreateTechnologyFromComponentParams = {
      name: input.name,
      type: input.type,
      domain: input.domain?.trim() || null,
      vendor: input.vendor?.trim() || null,
      ownerTeam: input.ownerTeam?.trim() || null,
      componentName: input.componentName.trim(),
      userId: input.userId,
      realUserId: input.realUserId ?? null
    }

    const name = await this.techRepo.createFromComponent(params)
    logger.info({ name, type: input.type, componentName: params.componentName, userId: input.userId }, 'Technology created')
    return name
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
  async delete(name: string, userId: string, realUserId?: string | null): Promise<void> {
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

    await this.techRepo.delete(name, userId, changes, realUserId)
    logger.info({ name, userId }, 'Technology deleted')
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
      domain: input.domain?.trim() || null,
      vendor: input.vendor?.trim() || null,
      ownerTeam: input.ownerTeam?.trim() || null,
      lastReviewed: input.lastReviewed?.trim() || null,
    }
    const changes = buildAuditChanges(before, after, allFields)

    const params: UpdateTechnologyParams = {
      name: input.name,
      type: input.type,
      domain: input.domain?.trim() || null,
      vendor: input.vendor?.trim() || null,
      ownerTeam: input.ownerTeam?.trim() || null,
      lastReviewed: input.lastReviewed?.trim() || null,
      userId: input.userId,
      realUserId: input.realUserId ?? null
    }

    const name = await this.techRepo.update({ ...params, changes })
    logger.info({ name, userId: input.userId }, 'Technology updated')
    return name
  }

  /**
   * Link a component to a technology via IS_VERSION_OF
   */
  async linkComponent(input: { technologyName: string; componentName: string; componentVersion: string; userId: string; realUserId?: string | null }) {
    const exists = await this.techRepo.exists(input.technologyName)
    if (!exists) {
      throw createError({ statusCode: 404, message: `Technology '${input.technologyName}' not found` })
    }
    const result = await this.techRepo.linkComponent(input)
    logger.info({ ...result, userId: input.userId }, 'Component linked to technology')
    return result
  }

  /**
   * Link a component to a technology via IS_VERSION_OF, matched by PURL.
   *
   * After linking, refreshes Team→Technology USES edges for every system
   * that uses the component so that compliance and version-constraint queries
   * reflect the new relationship immediately.
   */
  async linkComponentByPurl(input: { technologyName: string; purl: string; userId: string; realUserId?: string | null }): Promise<{ technologyName: string; name: string; purl: string }> {
    const exists = await this.techRepo.exists(input.technologyName)
    if (!exists) {
      throw createError({ statusCode: 404, message: `Technology '${input.technologyName}' not found` })
    }
    const result = await this.techRepo.linkComponentByPurl(input)
    for (const systemName of result.affectedSystems) {
      await this.sbomRepo.upsertTeamUsesTechnology(systemName)
    }
    logger.info({
      technologyName: result.technologyName,
      name: result.name,
      purl: result.purl,
      affectedSystems: result.affectedSystems.length,
      userId: input.userId
    }, 'Component linked to technology by purl')
    return { technologyName: result.technologyName, name: result.name, purl: result.purl }
  }

  /**
   * Link all components with a given name to a technology.
   *
   * After linking, refreshes Team→Technology USES edges for every system
   * that uses the components so that compliance and version-constraint queries
   * reflect the new relationship immediately.
   */
  async linkComponentByName(input: { technologyName: string; componentName: string; userId: string; realUserId?: string | null }): Promise<{ technologyName: string; name: string; count: number }> {
    const exists = await this.techRepo.exists(input.technologyName)
    if (!exists) {
      throw createError({ statusCode: 404, message: `Technology '${input.technologyName}' not found` })
    }
    const result = await this.techRepo.linkComponentsByName(input)
    for (const systemName of result.affectedSystems) {
      await this.sbomRepo.upsertTeamUsesTechnology(systemName)
    }
    logger.info({
      technologyName: result.technologyName,
      name: result.name,
      count: result.count,
      affectedSystems: result.affectedSystems.length,
      userId: input.userId
    }, 'Components linked to technology by name')
    return { technologyName: result.technologyName, name: result.name, count: result.count }
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

    const VALID_ENVIRONMENTS = ['dev', 'test', 'staging', 'prod']
    if (input.environment && !VALID_ENVIRONMENTS.includes(input.environment)) {
      throw createError({
        statusCode: 422,
        message: `Invalid environment. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`
      })
    }

    const exists = await this.techRepo.exists(input.technologyName)
    if (!exists) {
      throw createError({
        statusCode: 404,
        message: `Technology '${input.technologyName}' not found`
      })
    }

    const environment = input.environment ?? null

    // Fetch existing approval for this (team, environment) pair to compute the diff
    const existing = await this.techRepo.findExistingApproval(input.technologyName, input.teamName, environment)
    const before: Record<string, unknown> = {
      time: existing?.time ?? null,
      notes: existing?.notes ?? null,
    }
    const after: Record<string, unknown> = {
      time: input.time,
      notes: input.notes ?? null,
    }
    const changes = buildAuditChanges(before, after, ['time', 'notes'])
    // Team and environment don't "change" on an upsert, but recording them in
    // `changes` (not just entityId) answers "which teams approved tech X in
    // prod?" directly from the audit trail.
    changes.team = { before: input.teamName, after: input.teamName }
    changes.environment = { before: environment, after: environment }

    const params: UpsertApprovalParams = {
      technologyName: input.technologyName,
      teamName: input.teamName,
      time: input.time,
      notes: input.notes?.trim() || null,
      environment,
      userId: input.userId,
      realUserId: input.realUserId ?? null,
      correlationId: input.correlationId ?? null
    }

    const result = await this.techRepo.upsertApproval({ ...params, changes })
    logger.info({ technologyName: input.technologyName, teamName: input.teamName, time: input.time, userId: input.userId }, 'Technology approval set')
    return result
  }

  /**
   * Get all technologies shaped for the radar visualization.
   *
   * When `team` is provided each technology is placed in the ring matching
   * that team's TIME value; technologies without an approval from that team
   * are marked 'unclassified'.
   *
   * When no `team` is given the dominant TIME value across all approvals is
   * used (majority vote; ties broken by severity: eliminate > migrate >
   * tolerate > invest). Technologies with no approvals at all are
   * 'unclassified'.
   */
  async findForRadar(team?: string): Promise<RadarTechnology[]> {
    const rows = await this.techRepo.findForRadar()

    const severityOrder: TimeValue[] = ['eliminate', 'migrate', 'tolerate', 'invest']

    return rows.map(row => {
      let timeValue: TimeValue | 'unclassified' = 'unclassified'

      if (team) {
        const approval = row.approvals.find(a => a.team === team)
        if (approval && VALID_TIME_VALUES.includes(approval.time as TimeValue)) {
          timeValue = approval.time as TimeValue
        }
      } else if (row.approvals.length > 0) {
        // Count votes per TIME value
        const counts: Partial<Record<TimeValue, number>> = {}
        for (const a of row.approvals) {
          if (VALID_TIME_VALUES.includes(a.time as TimeValue)) {
            const t = a.time as TimeValue
            counts[t] = (counts[t] ?? 0) + 1
          }
        }
        const maxCount = Math.max(...Object.values(counts) as number[])
        // Among tied values pick the most severe
        const tied = severityOrder.filter(t => (counts[t] ?? 0) === maxCount)
        if (tied.length > 0) timeValue = tied[0]!
      }

      return {
        name: row.name,
        type: (row.type as ComponentType | null) ?? null,
        domain: (row.domain as TechnologyDomain | null) ?? null,
        timeValue,
        approvalCount: row.approvals.length,
      }
    })
  }
}

export interface RadarTechnology {
  name: string
  type: ComponentType | null
  domain: TechnologyDomain | null
  timeValue: TimeValue | 'unclassified'
  approvalCount: number
}
