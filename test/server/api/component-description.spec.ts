import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEvent } from 'h3'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'

/**
 * Unit tests for GET /api/components/description.
 *
 * The handler relies on H3 functions that Nuxt auto-imports at runtime.
 * We provide those as globals before the handler module is evaluated,
 * using top-level await so the ordering is guaranteed in ESM.
 */

// Mock fetchRegistryDescription before the handler module is loaded.
// vi.mock() is hoisted by Vitest above all imports, so the mock is in place
// before any module code runs.
vi.mock('../../../server/utils/registry-fetcher', () => ({
  fetchRegistryDescription: vi.fn()
}))

import { fetchRegistryDescription } from '../../../server/utils/registry-fetcher' // eslint-disable-line import/first

// Provide H3 functions as globals (Nuxt auto-imports) then load the handler.
// Top-level await guarantees this happens before describe/it blocks are registered.
const { defineEventHandler, getQuery, setResponseStatus } = await import('h3')
vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('getQuery', getQuery)
vi.stubGlobal('setResponseStatus', setResponseStatus)

// The handler module must be imported AFTER globals are set because it calls
// defineEventHandler() at module evaluation time (the `export default` line).
const { default: handler } = await import('../../../server/api/components/description.get')

/**
 * Creates a minimal H3 event whose query string is built from the supplied params.
 * The handler maintains a module-level in-memory cache for the lifetime of the
 * test run, so callers must supply a unique `params.name` per test to prevent
 * one test's cached result from leaking into another.
 *
 * @param params - Query parameters to include (e.g. `{ name, packageManager, group }`).
 *                 `params.name` must be unique across all tests to avoid cache pollution.
 */
function createMockEvent(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  req.url = `/api/components/description?${qs}`
  const res = new ServerResponse(req)
  return createEvent(req, res)
}

describe('GET /api/components/description', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parameter validation', () => {
    it('returns 400 when name is missing', async () => {
      const event = createMockEvent({ packageManager: 'npm' })
      const result = await handler(event)

      expect(event.node.res.statusCode).toBe(400)
      expect(result).toMatchObject({ error: expect.any(String) })
    })

    it('returns 400 when packageManager is missing', async () => {
      const event = createMockEvent({ name: 'react' })
      const result = await handler(event)

      expect(event.node.res.statusCode).toBe(400)
      expect(result).toMatchObject({ error: expect.any(String) })
    })

    it('returns 400 when both parameters are missing', async () => {
      const event = createMockEvent({})
      const result = await handler(event)

      expect(event.node.res.statusCode).toBe(400)
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('registry lookup', () => {
    it('returns description from the registry for a supported package manager', async () => {
      vi.mocked(fetchRegistryDescription).mockResolvedValue('A JavaScript library')

      const event = createMockEvent({ name: 'desc-test-unique-1', packageManager: 'npm' })
      const result = await handler(event)

      expect(result).toEqual({ description: 'A JavaScript library' })
      expect(fetchRegistryDescription).toHaveBeenCalledWith('desc-test-unique-1', 'npm', undefined)
    })

    it('passes group param to the registry fetcher', async () => {
      vi.mocked(fetchRegistryDescription).mockResolvedValue(null)

      const event = createMockEvent({ name: 'desc-test-unique-2', packageManager: 'maven', group: 'org.example' })
      await handler(event)

      expect(fetchRegistryDescription).toHaveBeenCalledWith('desc-test-unique-2', 'maven', 'org.example')
    })

    it('returns null description when the registry has no description', async () => {
      vi.mocked(fetchRegistryDescription).mockResolvedValue(null)

      const event = createMockEvent({ name: 'desc-test-unique-3', packageManager: 'cargo' })
      const result = await handler(event)

      expect(result).toEqual({ description: null })
    })
  })

  describe('caching', () => {
    it('serves cached result on second request without calling registry again', async () => {
      vi.mocked(fetchRegistryDescription).mockResolvedValue('Cached description')

      const params = { name: 'desc-test-unique-4', packageManager: 'npm' }

      // First request — cache miss, registry is called
      const result1 = await handler(createMockEvent(params))
      expect(result1).toEqual({ description: 'Cached description' })
      expect(fetchRegistryDescription).toHaveBeenCalledTimes(1)

      // Second request with identical params — cache hit, no second registry call
      const result2 = await handler(createMockEvent(params))
      expect(result2).toEqual({ description: 'Cached description' })
      expect(fetchRegistryDescription).toHaveBeenCalledTimes(1)
    })

    it('treats packageManager case-insensitively in the cache key', async () => {
      vi.mocked(fetchRegistryDescription).mockResolvedValue('Case-insensitive pkg')

      // First request uses uppercase packageManager — populates cache
      await handler(createMockEvent({ name: 'desc-test-unique-5', packageManager: 'NPM' }))
      expect(fetchRegistryDescription).toHaveBeenCalledTimes(1)

      // Second request with lowercase — normalised cache key matches, no new fetch
      await handler(createMockEvent({ name: 'desc-test-unique-5', packageManager: 'npm' }))
      expect(fetchRegistryDescription).toHaveBeenCalledTimes(1)
    })
  })
})
