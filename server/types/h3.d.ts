import type { Logger } from 'pino'

declare module 'h3' {
  interface H3EventContext {
    /** Per-request pino child logger. Carries requestId, method, and url. */
    logger: Logger
  }
}
