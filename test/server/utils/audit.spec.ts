import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import { auditFailedOperation, auditSensitiveRead } from '../../../server/utils/audit'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('../../../server/repositories/audit-log.repository', () => ({
  AuditLogRepository: vi.fn().mockImplementation(function (this: { create: typeof mockCreate }) {
    this.create = mockCreate
  })
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('auditFailedOperation', () => {
  it('records a failed operation with the operation suffixed _FAILED', async () => {
    await auditFailedOperation(mockEvent(), {
      operation: 'DELETE',
      entityType: 'System',
      entityId: 'payments',
      reason: 'System not found',
      userId: 'user-1'
    })

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'DELETE_FAILED',
      entityType: 'System',
      entityId: 'payments',
      entityLabel: 'payments',
      reason: 'System not found',
      source: 'API',
      userId: 'user-1',
      realUserId: null
    }))
  })

  it('attributes to "anonymous" when the caller passes that as the actor', async () => {
    await auditFailedOperation(mockEvent(), {
      operation: 'CREATE',
      entityType: 'Technology',
      entityId: 'react',
      reason: 'Superuser access required',
      userId: 'anonymous'
    })

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'CREATE_FAILED',
      userId: 'anonymous',
      realUserId: null
    }))
  })

  it('carries the real (impersonator) user id when impersonating', async () => {
    await auditFailedOperation(mockEvent(), {
      operation: 'UPDATE',
      entityType: 'Team',
      entityId: 'frontend-team',
      reason: 'Conflict',
      userId: 'user-1',
      realUserId: 'super-1'
    })

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ realUserId: 'super-1' }))
  })

  it('never throws when the audit write itself fails', async () => {
    mockCreate.mockRejectedValue(new Error('Neo4j unavailable'))

    await expect(auditFailedOperation(mockEvent(), {
      operation: 'DELETE',
      entityType: 'System',
      entityId: 'payments',
      reason: 'boom',
      userId: 'user-1'
    })).resolves.toBeUndefined()
  })

  it('carries the request correlationId/requestId from event.context', async () => {
    await auditFailedOperation(mockEvent({ correlationId: 'corr-1', requestId: 'req-1' }), {
      operation: 'DELETE',
      entityType: 'System',
      entityId: 'payments',
      reason: 'System not found',
      userId: 'user-1'
    })

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      correlationId: 'corr-1',
      requestId: 'req-1'
    }))
  })

  it('defaults source to "API" but honors an auditSource override from event.context (e.g. CI/CD token)', async () => {
    await auditFailedOperation(mockEvent({ auditSource: 'API (ci-cd)' }), {
      operation: 'DELETE',
      entityType: 'System',
      entityId: 'payments',
      reason: 'System not found',
      userId: 'user-1'
    })

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ source: 'API (ci-cd)' }))
  })
})

describe('auditSensitiveRead', () => {
  it('records a READ_SENSITIVE entry for the given actor', async () => {
    await auditSensitiveRead(mockEvent(), {
      entityType: 'User',
      entityId: 'all',
      reason: 'Listed all users',
      userId: 'user-1'
    })

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'READ_SENSITIVE',
      entityType: 'User',
      entityId: 'all',
      reason: 'Listed all users',
      userId: 'user-1'
    }))
  })

  it('never throws when the audit write itself fails', async () => {
    mockCreate.mockRejectedValue(new Error('Neo4j unavailable'))

    await expect(auditSensitiveRead(mockEvent(), {
      entityType: 'User',
      entityId: 'all',
      reason: 'boom',
      userId: 'user-1'
    })).resolves.toBeUndefined()
  })

  it('carries the request correlationId from event.context', async () => {
    await auditSensitiveRead(mockEvent({ correlationId: 'corr-2' }), {
      entityType: 'User',
      entityId: 'all',
      reason: 'Listed all users',
      userId: 'user-1'
    })

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ correlationId: 'corr-2' }))
  })
})
