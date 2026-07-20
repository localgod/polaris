import { logger } from '../utils/logger'
import { randomUUID } from 'crypto'

/**
 * Attaches a per-request child logger to `event.context.logger`, and a
 * correlation id to `event.context.correlationId`.
 *
 * The child logger inherits all base logger settings and automatically
 * includes `requestId`, `correlationId`, `method`, and `url` on every log
 * line emitted by downstream handlers and services. `requestId` is taken
 * from the incoming `x-request-id` header when present (e.g. set by a
 * reverse proxy), otherwise a new UUID is generated.
 *
 * `correlationId` is taken from the incoming `x-correlation-id` header when
 * present, otherwise it defaults to `requestId` — so a single request without
 * an explicit correlation header still gets one coherent id shared by its
 * logger and audit entries, and callers can chain further requests under the
 * same correlation id by echoing back the response header below.
 */
export default defineEventHandler((event) => {
  const requestId = getRequestHeader(event, 'x-request-id') ?? randomUUID()
  const correlationId = getRequestHeader(event, 'x-correlation-id') ?? requestId

  event.context.requestId = requestId
  event.context.correlationId = correlationId
  event.context.logger = logger.child({
    requestId,
    correlationId,
    method: event.node.req.method,
    url: event.node.req.url,
  })

  setResponseHeader(event, 'x-correlation-id', correlationId)
})
