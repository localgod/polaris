import { BaseRepository } from './base.repository'
import type { TechnologyPolicy, PolicyException, PolicyResolution, TimeValue, PolicyStatus, ExceptionScope } from '~~/types/api'

export interface UpsertPolicyParams {
  technologyName: string
  time: string
  rationale: string | null
  migrationTarget: string | null
  effectiveDate: string | null
  expiryDate: string | null
  userId: string
  userName: string | null
  realUserId: string | null
  correlationId: string | null
  changes: string
}

export interface CreateExceptionParams {
  technologyName: string
  time: string
  reason: string
  approver: string
  scope: string
  scopeName: string
  environment: string | null
  effectiveDate: string
  expiresAt: string
  userId: string
  realUserId: string | null
  correlationId: string | null
  changes: string
}

export interface ReviewQueueItem {
  id: string
  technologyName: string
  conflictingValues: string[]
  reviewedAt: string | null
  createdAt: string
  technologyExists: boolean
}

export interface ResolvePolicyParams {
  technologyName: string
  teamName: string | null
  systemName: string | null
  environment: string | null
}

export class PolicyRepository extends BaseRepository {
  async findActive(technologyName: string): Promise<TechnologyPolicy | null> {
    const query = await loadQuery('policies/find-active.cypher')
    const { records } = await this.executeQuery(query, { technologyName })
    if (records.length === 0) return null
    return this.mapToPolicy(records[0]!)
  }

  async findHistory(technologyName: string): Promise<TechnologyPolicy[]> {
    const query = await loadQuery('policies/find-history.cypher')
    const { records } = await this.executeQuery(query, { technologyName })
    return records.map(r => this.mapToPolicyBasic(r))
  }

  async upsert(params: UpsertPolicyParams): Promise<TechnologyPolicy> {
    const query = await loadQuery('policies/upsert.cypher')
    const { records } = await this.executeQuery(query, params)
    if (records.length === 0) {
      throw new Error(`Failed to upsert policy — technology '${params.technologyName}' not found`)
    }
    return this.mapToPolicyBasic(records[0]!)
  }

  async activate(policyId: string, userId: string, realUserId: string | null, correlationId: string | null): Promise<TechnologyPolicy> {
    const query = await loadQuery('policies/activate.cypher')
    const { records } = await this.executeQuery(query, { policyId, userId, realUserId, correlationId })
    if (records.length === 0) {
      throw new Error(`Policy '${policyId}' not found or not in draft status`)
    }
    return this.mapToPolicyBasic(records[0]!)
  }

  async archive(policyId: string, userId: string, realUserId: string | null, correlationId: string | null): Promise<TechnologyPolicy> {
    const query = await loadQuery('policies/archive.cypher')
    const { records } = await this.executeQuery(query, { policyId, userId, realUserId, correlationId })
    if (records.length === 0) {
      throw new Error(`Policy '${policyId}' not found or already archived`)
    }
    return this.mapToPolicyBasic(records[0]!)
  }

  async resolve(params: ResolvePolicyParams): Promise<PolicyResolution> {
    const query = await loadQuery('policies/resolve.cypher')
    const { records } = await this.executeQuery(query, params)
    if (records.length === 0) {
      return { time: 'unclassified', source: 'unclassified', policyId: null, exceptionId: null }
    }
    const r = records[0]!
    return {
      time: r.get('time') as TimeValue | 'unclassified',
      source: r.get('source'),
      policyId: r.get('policyId') ?? null,
      exceptionId: r.get('exceptionId') ?? null,
    }
  }

  async createException(params: CreateExceptionParams): Promise<PolicyException> {
    const query = await loadQuery('policies/create-exception.cypher')
    const { records } = await this.executeQuery(query, params)
    if (records.length === 0) {
      throw new Error(`Failed to create exception — no active policy found for technology '${params.technologyName}'`)
    }
    return this.mapToException(records[0]!)
  }

  async revokeException(exceptionId: string, userId: string, realUserId: string | null, correlationId: string | null): Promise<PolicyException> {
    const query = await loadQuery('policies/revoke-exception.cypher')
    const { records } = await this.executeQuery(query, { exceptionId, userId, realUserId, correlationId })
    if (records.length === 0) {
      throw new Error(`Exception '${exceptionId}' not found or already revoked`)
    }
    return this.mapToException(records[0]!)
  }

  private mapToPolicy(record: import('neo4j-driver').Record): TechnologyPolicy {
    const exceptions: PolicyException[] = (record.get('exceptions') ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      time: e.time as TimeValue,
      reason: e.reason as string,
      approver: e.approver as string,
      scope: e.scope as ExceptionScope,
      scopeName: e.scopeName as string,
      environment: (e.environment as string | null) ?? null,
      effectiveDate: e.effectiveDate as string,
      expiresAt: e.expiresAt as string,
      createdAt: e.createdAt as string,
      revokedAt: null,
      revokedBy: null,
    }))
    return {
      ...this.mapToPolicyBasic(record),
      exceptions,
    }
  }

  private mapToPolicyBasic(record: import('neo4j-driver').Record): TechnologyPolicy {
    return {
      id: record.get('id'),
      time: record.get('time') as TimeValue,
      rationale: record.get('rationale') ?? null,
      migrationTarget: record.get('migrationTarget') ?? null,
      status: record.get('status') as PolicyStatus,
      effectiveDate: record.get('effectiveDate') ?? null,
      expiryDate: record.get('expiryDate') ?? null,
      createdBy: record.get('createdBy'),
      createdByName: record.get('createdByName') ?? null,
      createdAt: record.get('createdAt'),
      updatedAt: record.get('updatedAt'),
    }
  }

  async findReviewQueue(): Promise<ReviewQueueItem[]> {
    const query = await loadQuery('policies/find-review-queue.cypher')
    const { records } = await this.executeQuery(query)
    return records.map(r => ({
      id: r.get('id') as string,
      technologyName: r.get('technologyName') as string,
      conflictingValues: r.get('conflictingValues') as string[],
      reviewedAt: r.get('reviewedAt') as string | null,
      createdAt: r.get('createdAt') as string,
      technologyExists: r.get('technologyExists') as boolean,
    }))
  }

  private mapToException(record: import('neo4j-driver').Record): PolicyException {
    return {
      id: record.get('id'),
      time: record.get('time') as TimeValue,
      reason: record.get('reason'),
      approver: record.get('approver'),
      scope: record.get('scope') as ExceptionScope,
      scopeName: record.get('scopeName'),
      environment: record.get('environment') ?? null,
      effectiveDate: record.get('effectiveDate'),
      expiresAt: record.get('expiresAt'),
      createdAt: record.get('createdAt'),
      revokedAt: record.get('revokedAt') ?? null,
      revokedBy: record.get('revokedBy') ?? null,
    }
  }
}
