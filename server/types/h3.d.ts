import type { Logger } from 'pino'

declare module 'h3' {
  interface H3EventContext {
    /** Per-request pino child logger. Carries requestId, correlationId, method, and url. */
    logger: Logger
    /** Id for this specific HTTP request, from `x-request-id` or a generated UUID. */
    requestId: string
    /** Correlation id for this request, from `x-correlation-id` or the generated requestId. */
    correlationId: string
    /** Audit `source` override derived from the resolved auth (e.g. Bearer token type). */
    auditSource?: string
  }
}
