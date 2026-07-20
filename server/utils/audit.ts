import type { H3Event } from 'h3'
import { AuditLogRepository } from '../repositories/audit-log.repository'
import { logger as baseLogger } from './logger'

const auditLogRepo = new AuditLogRepository()

export interface AuditFailureParams {
  /** Base operation being attempted, e.g. 'CREATE', 'UPDATE', 'DELETE' — stored as '<operation>_FAILED' */
  operation: string
  entityType: string
  entityId: string
  entityLabel?: string
  reason: string
  /** Acting user id, or 'anonymous' if the attempt failed before authentication resolved */
  userId: string
  realUserId?: string | null
}

/**
 * Records a failed CRUD attempt so compliance/security teams can see who tried
 * to do what and failed (unauthorized access attempts, malformed requests, etc).
 *
 * Never throws: a broken audit write must not mask the original error being
 * returned to the caller, so failures here are logged and swallowed.
 *
 * Takes the acting user id directly rather than re-deriving it from `event`
 * — every call site already has it from the auth guard it ran first, and
 * re-deriving would mean importing server/utils/auth (which pulls in the
 * Nuxt-only '#auth' module) into every handler test that exercises a failure path.
 */
export async function auditFailedOperation(event: H3Event, params: AuditFailureParams): Promise<void> {
  try {
    await auditLogRepo.create({
      operation: `${params.operation}_FAILED`,
      entityType: params.entityType,
      entityId: params.entityId,
      entityLabel: params.entityLabel || params.entityId,
      reason: params.reason,
      source: event.context.auditSource ?? 'API',
      userId: params.userId,
      realUserId: params.realUserId ?? null,
      correlationId: event.context.correlationId ?? null,
      requestId: event.context.requestId ?? null
    })
  } catch (auditError) {
    ;(event.context.logger ?? baseLogger).error({ err: auditError }, 'Failed to write audit log for failed operation')
  }
}

export interface AuditSensitiveReadParams {
  entityType: string
  entityId: string
  entityLabel?: string
  reason: string
  userId: string
  realUserId?: string | null
}

/**
 * Records a read of sensitive data (PII, tokens, approval reasoning, audit
 * history) by an authenticated user.
 */
export async function auditSensitiveRead(event: H3Event, params: AuditSensitiveReadParams): Promise<void> {
  try {
    await auditLogRepo.create({
      operation: 'READ_SENSITIVE',
      entityType: params.entityType,
      entityId: params.entityId,
      entityLabel: params.entityLabel || params.entityId,
      reason: params.reason,
      source: event.context.auditSource ?? 'API',
      userId: params.userId,
      realUserId: params.realUserId ?? null,
      correlationId: event.context.correlationId ?? null,
      requestId: event.context.requestId ?? null
    })
  } catch (auditError) {
    ;(event.context.logger ?? baseLogger).error({ err: auditError }, 'Failed to write audit log for sensitive read')
  }
}
