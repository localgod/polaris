import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Platform, TechnologyApproval } from '~~/types/api'
import { buildOrderByClause, type SortParams, type SortConfig } from '../utils/sorting'
import { buildCreateChanges } from '../utils/audit-diff'
import { toDateString } from '../utils/neo4j'

const platformSortConfig: SortConfig = {
  allowedFields: {
    name: 'p.name',
    type: 'p.type',
    domain: 'p.domain',
    stewardTeam: 'team.name'
  },
  defaultOrderBy: 'p.domain ASC, p.name ASC'
}

export interface UpsertPlatformApprovalParams {
  platformName: string
  teamName: string
  time: string
  notes: string | null
  environment: string | null
  userId: string
  realUserId?: string | null
}

export interface UpdatePlatformParams {
  name: string
  type: string
  domain: string | null
  vendor: string | null
  stewardTeam: string | null
  userId: string
  realUserId?: string | null
}

export interface CreatePlatformParams {
  name: string
  type: string
  domain: string | null
  vendor: string | null
  stewardTeam: string | null
  userId: string
  realUserId?: string | null
}

export interface PlatformDetail extends Platform {
  stewardTeamEmail?: string | null
}

/**
 * Repository for platform-related data access.
 *
 * Platform mirrors Technology's stewardship/approval shape for manually
 * declared, non-SBOM-observable technology — see
 * docs/architecture/decisions/0004-technology-requires-component.md.
 */
export class PlatformRepository extends BaseRepository {
  async findAll(sort?: SortParams, limit = 50, offset = 0): Promise<{ data: Platform[]; total: number }> {
    const query = await loadQuery('platforms/find-all.cypher')
    const orderBy = buildOrderByClause(sort || {}, platformSortConfig)
    const finalQuery = injectOrderBy(query, orderBy)
    const { records } = await this.executeQuery(finalQuery, { limit, offset })

    const total = records.length > 0 ? records[0]!.get('total').toNumber() : 0
    return { data: records.map(record => this.mapToPlatform(record)), total }
  }

  async findByName(name: string): Promise<PlatformDetail | null> {
    const query = await loadQuery('platforms/find-by-name.cypher')
    const { records } = await this.executeQuery(query, { name })

    if (records.length === 0) {
      return null
    }

    return this.mapToPlatformDetail(records[0]!)
  }

  async exists(name: string): Promise<boolean> {
    const query = await loadQuery('platforms/check-exists.cypher')
    const { records } = await this.executeQuery(query, { name })
    return records.length > 0
  }

  async create(params: CreatePlatformParams): Promise<string> {
    const query = await loadQuery('platforms/create.cypher')
    const changes = JSON.stringify(buildCreateChanges({
      name: params.name,
      type: params.type,
      domain: params.domain || null,
      vendor: params.vendor || null,
    }))
    const { records } = await this.executeQuery(query, {
      name: params.name,
      type: params.type,
      domain: params.domain || null,
      vendor: params.vendor || null,
      stewardTeam: params.stewardTeam || null,
      userId: params.userId,
      realUserId: params.realUserId ?? null,
      changes,
    })

    if (records.length === 0) {
      throw new Error('Failed to create platform')
    }

    return records[0]!.get('name')
  }

  /**
   * Find the steward team of a platform
   */
  async findStewardTeam(name: string): Promise<{ name: string; stewardTeam: string | null } | null> {
    const query = await loadQuery('platforms/find-steward-team.cypher')
    const { records } = await this.executeQuery(query, { name })

    if (records.length === 0) {
      return null
    }

    return {
      name: records[0]!.get('name'),
      stewardTeam: records[0]!.get('stewardTeam')
    }
  }

  async update(params: UpdatePlatformParams & { changes: Record<string, { before: unknown; after: unknown }> }): Promise<string> {
    const query = await loadQuery('platforms/update.cypher')
    const { records } = await this.executeQuery(query, { ...params, changes: JSON.stringify(params.changes) })
    if (records.length === 0) {
      throw createError({ statusCode: 404, message: `Platform '${params.name}' not found` })
    }
    return records[0]!.get('name')
  }

  async delete(name: string, userId: string, changes: Record<string, { before: unknown; after: unknown }>, realUserId?: string | null): Promise<void> {
    const query = await loadQuery('platforms/delete.cypher')
    await this.executeQuery(query, { name, userId, realUserId: realUserId ?? null, changes: JSON.stringify(changes) })
  }

  /**
   * Fetch the existing APPROVES relationship for a team→platform pair, if any.
   */
  async findExistingApproval(platformName: string, teamName: string, environment: string | null): Promise<{ time: string | null; notes: string | null } | null> {
    const query = await loadQuery('platforms/find-existing-approval.cypher')
    const { records } = await this.executeQuery(query, { platformName, teamName, environment })

    if (records.length === 0) return null
    return {
      time: records[0]!.get('time') ?? null,
      notes: records[0]!.get('notes') ?? null,
    }
  }

  async upsertApproval(params: UpsertPlatformApprovalParams & { changes: Record<string, { before: unknown; after: unknown }> }): Promise<{ time: string; team: string }> {
    const query = await loadQuery('platforms/upsert-approval.cypher')
    const { records } = await this.executeQuery(query, { ...params, approvedBy: params.userId, changes: JSON.stringify(params.changes) })

    if (records.length === 0) {
      throw new Error('Failed to set approval — platform or team not found')
    }

    return {
      time: records[0]!.get('time'),
      team: records[0]!.get('team')
    }
  }

  /**
   * Map Neo4j record to Platform domain object
   */
  private mapToPlatform(record: Neo4jRecord): Platform {
    return {
      name: record.get('name'),
      type: record.get('type'),
      domain: record.get('domain'),
      vendor: record.get('vendor'),
      stewardTeamName: record.get('stewardTeamName'),
      approvals: record.get('approvals').filter((a: { team?: string }) => a.team)
    }
  }

  /**
   * Map Neo4j record to PlatformDetail domain object
   */
  private mapToPlatformDetail(record: Neo4jRecord): PlatformDetail {
    const approvals = record.get('approvals').filter((a: { team?: string }) => a.team).map((a: TechnologyApproval & { approvedAt?: unknown; deprecatedAt?: unknown; eolDate?: unknown }) => ({
      ...a,
      approvedAt: toDateString(a.approvedAt),
      deprecatedAt: toDateString(a.deprecatedAt),
      eolDate: toDateString(a.eolDate)
    }))

    return {
      name: record.get('name'),
      type: record.get('type'),
      domain: record.get('domain'),
      vendor: record.get('vendor'),
      stewardTeamName: record.get('stewardTeamName'),
      stewardTeamEmail: record.get('stewardTeamEmail'),
      approvals
    }
  }
}
