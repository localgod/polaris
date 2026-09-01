import { createError } from 'h3'
import { PolicyRepository, type ReviewQueueItem } from '../repositories/policy.repository'
import { TechnologyRepository } from '../repositories/technology.repository'
import { UserRepository } from '../repositories/user.repository'
import { buildAuditChanges, buildCreateChanges } from '../utils/audit-diff'
import { logger } from '../utils/logger'
import type { TechnologyPolicy, PolicyException, PolicyResolution, TimeValue } from '~~/types/api'

const VALID_TIME_VALUES: TimeValue[] = ['tolerate', 'invest', 'migrate', 'eliminate']
const VALID_ENVIRONMENTS = ['dev', 'test', 'staging', 'prod']
const VALID_SCOPES = ['team', 'system']

export interface ProposePolicyInput {
  technologyName: string
  time: string
  rationale?: string | null
  migrationTarget?: string | null
  effectiveDate?: string | null
  expiryDate?: string | null
  userId: string
  realUserId?: string | null
  correlationId?: string | null
}

export interface CreateExceptionInput {
  technologyName: string
  time: string
  reason: string
  approver: string
  scope: string
  scopeName: string
  environment?: string | null
  effectiveDate: string
  expiresAt: string
  userId: string
  realUserId?: string | null
  correlationId?: string | null
}

export interface ResolvePolicyInput {
  technologyName: string
  teamName?: string | null
  systemName?: string | null
  environment?: string | null
}

export class PolicyService {
  private readonly policyRepo: PolicyRepository
  private readonly techRepo: TechnologyRepository
  private readonly userRepo: UserRepository

  constructor(policyRepo?: PolicyRepository, techRepo?: TechnologyRepository, userRepo?: UserRepository) {
    this.policyRepo = policyRepo ?? new PolicyRepository()
    this.techRepo = techRepo ?? new TechnologyRepository()
    this.userRepo = userRepo ?? new UserRepository()
  }

  async getActive(technologyName: string): Promise<TechnologyPolicy | null> {
    return this.policyRepo.findActive(technologyName)
  }

  async getHistory(technologyName: string): Promise<TechnologyPolicy[]> {
    return this.policyRepo.findHistory(technologyName)
  }

  async getReviewQueue(): Promise<ReviewQueueItem[]> {
    return this.policyRepo.findReviewQueue()
  }

  async propose(input: ProposePolicyInput): Promise<TechnologyPolicy> {
    if (!VALID_TIME_VALUES.includes(input.time as TimeValue)) {
      throw createError({ statusCode: 422, message: `Invalid TIME value. Must be one of: ${VALID_TIME_VALUES.join(', ')}` })
    }

    const exists = await this.techRepo.exists(input.technologyName)
    if (!exists) {
      throw createError({ statusCode: 404, message: `Technology '${input.technologyName}' not found` })
    }

    const existing = await this.policyRepo.findActive(input.technologyName)
    const before: Record<string, unknown> = {
      time: existing?.time ?? null,
      rationale: existing?.rationale ?? null,
      migrationTarget: existing?.migrationTarget ?? null,
    }
    const after: Record<string, unknown> = {
      time: input.time,
      rationale: input.rationale ?? null,
      migrationTarget: input.migrationTarget ?? null,
    }
    const changes = JSON.stringify(buildAuditChanges(before, after, ['time', 'rationale', 'migrationTarget']))

    const result = await this.policyRepo.upsert({
      technologyName: input.technologyName,
      time: input.time,
      rationale: input.rationale ?? null,
      migrationTarget: input.migrationTarget ?? null,
      effectiveDate: input.effectiveDate ?? null,
      expiryDate: input.expiryDate ?? null,
      userId: input.userId,
      userName: null,
      realUserId: input.realUserId ?? null,
      correlationId: input.correlationId ?? null,
      changes,
    })
    logger.info({ technologyName: input.technologyName, time: input.time, userId: input.userId }, 'Technology policy proposed')
    return result
  }

  async activate(policyId: string, userId: string, realUserId?: string | null, correlationId?: string | null): Promise<TechnologyPolicy> {
    const result = await this.policyRepo.activate(policyId, userId, realUserId ?? null, correlationId ?? null)
    logger.info({ policyId, userId }, 'Technology policy activated')
    return result
  }

  async archive(policyId: string, userId: string, realUserId?: string | null, correlationId?: string | null): Promise<TechnologyPolicy> {
    const result = await this.policyRepo.archive(policyId, userId, realUserId ?? null, correlationId ?? null)
    logger.info({ policyId, userId }, 'Technology policy archived')
    return result
  }

  async resolve(input: ResolvePolicyInput): Promise<PolicyResolution> {
    return this.policyRepo.resolve({
      technologyName: input.technologyName,
      teamName: input.teamName ?? null,
      systemName: input.systemName ?? null,
      environment: input.environment ?? null,
    })
  }

  async createException(input: CreateExceptionInput): Promise<PolicyException> {
    if (!VALID_TIME_VALUES.includes(input.time as TimeValue)) {
      throw createError({ statusCode: 422, message: `Invalid TIME value. Must be one of: ${VALID_TIME_VALUES.join(', ')}` })
    }
    if (!VALID_SCOPES.includes(input.scope)) {
      throw createError({ statusCode: 422, message: `Invalid scope. Must be one of: ${VALID_SCOPES.join(', ')}` })
    }
    if (input.environment && !VALID_ENVIRONMENTS.includes(input.environment)) {
      throw createError({ statusCode: 422, message: `Invalid environment. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}` })
    }

    const activePolicy = await this.policyRepo.findActive(input.technologyName)
    if (!activePolicy) {
      throw createError({ statusCode: 409, message: `No active policy found for technology '${input.technologyName}'. Activate a policy before creating exceptions.` })
    }

    const changes = JSON.stringify(buildCreateChanges({
      time: input.time,
      reason: input.reason,
      scope: input.scope,
      scopeName: input.scopeName,
      environment: input.environment ?? null,
      effectiveDate: input.effectiveDate,
      expiresAt: input.expiresAt,
    }))

    const result = await this.policyRepo.createException({
      technologyName: input.technologyName,
      time: input.time,
      reason: input.reason,
      approver: input.approver,
      scope: input.scope,
      scopeName: input.scopeName,
      environment: input.environment ?? null,
      effectiveDate: input.effectiveDate,
      expiresAt: input.expiresAt,
      userId: input.userId,
      realUserId: input.realUserId ?? null,
      correlationId: input.correlationId ?? null,
      changes,
    })
    logger.info({ technologyName: input.technologyName, exceptionId: result.id, scope: input.scope, scopeName: input.scopeName }, 'Policy exception created')
    return result
  }

  async revokeException(exceptionId: string, userId: string, realUserId?: string | null, correlationId?: string | null): Promise<PolicyException> {
    const result = await this.policyRepo.revokeException(exceptionId, userId, realUserId ?? null, correlationId ?? null)
    logger.info({ exceptionId, userId }, 'Policy exception revoked')
    return result
  }
}
