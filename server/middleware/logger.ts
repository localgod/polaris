import { logger } from '../utils/logger'
import { randomUUID } from 'crypto'

/**
 * Attaches a per-request child logger to `event.context.logger`.
 *
 * The child logger inherits all base logger settings and automatically
 * includes `requestId`, `method`, and `url` on every log line emitted
 * by downstream handlers and services. `requestId` is taken from the
 * incoming `x-request-id` header when present (e.g. set by a reverse
 * proxy), otherwise a new UUID is generated.
 */
export default defineEventHandler((event) => {
  const requestId = getRequestHeader(event, 'x-request-id') ?? randomUUID()
  event.context.logger = logger.child({
    requestId,
    method: event.node.req.method,
    url: event.node.req.url,
  })
})
