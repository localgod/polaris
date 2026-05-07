import { createEvent } from 'h3'
import { IncomingMessage, ServerResponse } from 'http'
import pino from 'pino'

const PARSED_BODY_SYMBOL = Symbol.for('h3ParsedBody')

/** Silent pino logger used in tests so handler code can call event.context.logger without errors. */
const testLogger = pino({ level: 'silent' })

export interface MockEventOptions {
  method?: string
  query?: Record<string, string>
  params?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
}

/**
 * Create a minimal H3 event for handler-level unit tests.
 *
 * Injects query params via the URL, path params via event.context.params,
 * and body via the h3 parsed-body symbol so readBody() returns it directly
 * without needing a real HTTP stream.
 */
export function mockEvent(options: MockEventOptions = {}) {
  const { method = 'GET', query = {}, params = {}, body, headers = {} } = options

  const qs = new URLSearchParams(query).toString()
  const req = new IncomingMessage(null as never)
  req.method = method
  req.url = qs ? `/?${qs}` : '/'

  for (const [key, value] of Object.entries(headers)) {
    req.headers[key.toLowerCase()] = value
  }

  const res = new ServerResponse(req)
  const event = createEvent(req, res)

  event.context.logger = testLogger

  if (Object.keys(params).length > 0) {
    event.context.params = params
  }

  if (body !== undefined) {
    // Pre-populate the parsed body cache so readBody() returns it immediately
    ;(req as never as Record<symbol, unknown>)[PARSED_BODY_SYMBOL] = body
  }

  return event
}
