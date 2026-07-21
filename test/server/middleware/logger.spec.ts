import { describe, it, expect } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import loggerMiddleware from '../../../server/middleware/logger'

describe('[contract] logger middleware', () => {
  it('generates a requestId and uses it as correlationId when no headers are present', async () => {
    const event = mockEvent()

    await loggerMiddleware(event)

    expect(event.context.requestId).toBeTruthy()
    expect(event.context.correlationId).toBe(event.context.requestId)
    expect(event.context.logger).toBeDefined()
  })

  it('takes requestId from the x-request-id header when present', async () => {
    const event = mockEvent({ headers: { 'x-request-id': 'req-abc' } })

    await loggerMiddleware(event)

    expect(event.context.requestId).toBe('req-abc')
    expect(event.context.correlationId).toBe('req-abc')
  })

  it('takes correlationId from the x-correlation-id header independently of requestId', async () => {
    const event = mockEvent({ headers: { 'x-request-id': 'req-abc', 'x-correlation-id': 'corr-xyz' } })

    await loggerMiddleware(event)

    expect(event.context.requestId).toBe('req-abc')
    expect(event.context.correlationId).toBe('corr-xyz')
  })

  it('echoes the correlationId back on the response header', async () => {
    const event = mockEvent({ headers: { 'x-correlation-id': 'corr-xyz' } })

    await loggerMiddleware(event)

    expect(event.node.res.getHeader('x-correlation-id')).toBe('corr-xyz')
  })
})
