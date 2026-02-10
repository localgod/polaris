/**
 * Shared setup for service unit tests.
 *
 * Provides a mock for Nuxt's `createError` (used by services to throw
 * HTTP errors) so tests can assert on status codes and messages.
 */
import { vi } from 'vitest'

// Mock Nuxt's createError global used by services
global.createError = vi.fn((opts: { statusCode: number; statusMessage: string; message?: string }) => {
  const err = new Error(opts.message || opts.statusMessage) as Error & { statusCode: number; statusMessage: string }
  err.statusCode = opts.statusCode
  err.statusMessage = opts.statusMessage
  return err
})

declare global {
  var createError: (opts: { statusCode: number; statusMessage: string; message?: string }) => Error
}
