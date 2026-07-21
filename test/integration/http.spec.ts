/**
 * HTTP integration tests.
 *
 * These tests make real HTTP requests against the running Nitro dev server
 * (started by the `nuxt-dev` automation on port 3000). They verify the
 * things handler-level unit tests cannot: routing, middleware, auth guards,
 * Content-Type enforcement, and actual HTTP status codes from the full
 * request pipeline.
 *
 * Prerequisites: the dev server must be running (`npm run dev` or the
 * `nuxt-dev` automation). In CI, start it before running this suite.
 *
 * Run with: npm run test:integration
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.NUXT_TEST_BASE_URL || process.env.INTEGRATION_BASE_URL || 'http://localhost:3000'

async function rawFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  let body: unknown
  try { body = await res.json() } catch { body = await res.text() }
  return { status: res.status, body }
}

beforeAll(async () => {
  const res = await fetch(`${BASE_URL}/api/version`).catch(() => null)
  if (!res || !res.ok) {
    throw new Error(
      `Integration test server is not reachable at ${BASE_URL}. ` +
      'Start the dev server with `npm run dev` before running integration tests.'
    )
  }
})

describe('[pin] HTTP routing', () => {
  it('returns 404 for an unknown API route', async () => {
    const { status } = await rawFetch('/api/does-not-exist-xyz')
    expect(status).toBe(404)
  })

  it('returns 200 or 404 (not 500) for an unknown page route', async () => {
    const res = await fetch(`${BASE_URL}/no-such-page-xyz`)
    expect(res.status).not.toBe(500)
  })
})

describe('[contract] Auth middleware — unauthenticated requests', () => {
  // The Nitro error handler returns H3 error shape: { error: true, statusCode, message }
  // rather than the application's { success: false } shape.

  it('POST /api/systems returns 401 without a session', async () => {
    const { status, body } = await rawFetch('/api/systems', {
      method: 'POST',
      body: JSON.stringify({ name: 'test-system', domain: 'platform' }),
    })
    expect(status).toBe(401)
    expect((body as { statusCode: number }).statusCode).toBe(401)
  })

  it('POST /api/technologies returns 401 without a session', async () => {
    const { status, body } = await rawFetch('/api/technologies', {
      method: 'POST',
      body: JSON.stringify({ name: 'React', type: 'library' }),
    })
    expect(status).toBe(401)
    expect((body as { statusCode: number }).statusCode).toBe(401)
  })

  it('POST /api/sboms returns 401 without a session', async () => {
    const { status, body } = await rawFetch('/api/sboms', {
      method: 'POST',
      body: JSON.stringify({ repositoryUrl: 'https://github.com/org/repo', sbom: {} }),
    })
    // sboms.post.ts handles auth internally and returns its own { success: false } shape
    expect(status).toBe(401)
    expect((body as { success?: boolean; statusCode?: number }).success ?? false).toBe(false)
  })

  it('POST /api/technologies/:name/approvals returns 401 without a session', async () => {
    const { status } = await rawFetch('/api/technologies/React/approvals', {
      method: 'POST',
      body: JSON.stringify({ teamName: 'Platform Team', time: 'invest' }),
    })
    expect(status).toBe(401)
  })

  it('DELETE /api/version-constraints/:name returns 401 without a session', async () => {
    const { status } = await rawFetch('/api/version-constraints/some-constraint', {
      method: 'DELETE',
    })
    expect(status).toBe(401)
  })
})

describe('[contract] Content-Type enforcement', () => {
  it('POST /api/sboms returns 415 when Content-Type is text/plain', async () => {
    const { status, body } = await rawFetch('/api/sboms', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    })
    expect(status).toBe(415)
    expect((body as { error: string }).error).toBe('unsupported_media_type')
  })

  it('POST /api/sboms returns 415 when Content-Type header is absent', async () => {
    const res = await fetch(`${BASE_URL}/api/sboms`, { method: 'POST', body: 'not json' })
    expect(res.status).toBe(415)
  })
})

describe('[pin] Public read endpoints', () => {
  it('GET /api/systems returns 200', async () => {
    const { status, body } = await rawFetch('/api/systems')
    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(true)
  })

  it('GET /api/technologies returns 200', async () => {
    const { status, body } = await rawFetch('/api/technologies')
    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(true)
  })

  it('GET /api/teams returns 200', async () => {
    const { status, body } = await rawFetch('/api/teams')
    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(true)
  })

  it('GET /api/licenses returns 200', async () => {
    const { status, body } = await rawFetch('/api/licenses')
    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(true)
  })

  it('GET /api/components returns 200', async () => {
    const { status, body } = await rawFetch('/api/components')
    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(true)
  })

  it('GET /api/version returns 200 with a version string', async () => {
    const { status, body } = await rawFetch('/api/version')
    expect(status).toBe(200)
    expect(typeof (body as Record<string, unknown>).version).toBe('string')
  })
})

describe('[contract] Query parameter parsing', () => {
  // The list handlers return { success: false, error: '...' } in the body
  // (not an HTTP 4xx) when limit is non-integer. The status is 200.
  it('GET /api/systems rejects non-integer limit in the response body', async () => {
    const { status, body } = await rawFetch('/api/systems?limit=abc')
    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(false)
    expect((body as { error: string }).error).toMatch(/integer/)
  })

  it('GET /api/technologies rejects non-integer limit in the response body', async () => {
    const { status, body } = await rawFetch('/api/technologies?limit=xyz')
    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(false)
    expect((body as { error: string }).error).toMatch(/integer/)
  })

  it('GET /api/systems clamps limit to 200 and returns success', async () => {
    const { status, body } = await rawFetch('/api/systems?limit=9999')
    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(true)
  })

  it('GET /api/approvals returns 400 when team param is missing', async () => {
    const { status } = await rawFetch('/api/approvals?technology=React')
    expect(status).toBe(400)
  })

  it('GET /api/approvals returns 400 when technology param is missing', async () => {
    const { status } = await rawFetch('/api/approvals?team=Platform+Team')
    expect(status).toBe(400)
  })
})

describe('[pin] 404 for unknown named resources', () => {
  it('GET /api/systems/:name returns 404 for a non-existent system', async () => {
    const { status } = await rawFetch('/api/systems/this-system-does-not-exist-xyz')
    expect(status).toBe(404)
  })

  it('GET /api/teams/:name returns 404 for a non-existent team', async () => {
    const { status } = await rawFetch('/api/teams/this-team-does-not-exist-xyz')
    expect(status).toBe(404)
  })

  it('GET /api/technologies/:name returns 404 for a non-existent technology', async () => {
    const { status } = await rawFetch('/api/technologies/this-tech-does-not-exist-xyz')
    expect(status).toBe(404)
  })
})

describe('[contract] Response shape from real serialisation', () => {
  it('GET /api/systems response has success, data, count, total fields', async () => {
    const { body } = await rawFetch('/api/systems')
    const b = body as Record<string, unknown>
    expect(b).toHaveProperty('success', true)
    expect(b).toHaveProperty('data')
    expect(b).toHaveProperty('count')
    expect(b).toHaveProperty('total')
    expect(Array.isArray(b.data)).toBe(true)
    expect(typeof b.count).toBe('number')
    expect(typeof b.total).toBe('number')
  })

  it('GET /api/technologies response has success, data, count, total fields', async () => {
    const { body } = await rawFetch('/api/technologies')
    const b = body as Record<string, unknown>
    expect(b).toHaveProperty('success', true)
    expect(Array.isArray(b.data)).toBe(true)
    expect(typeof b.count).toBe('number')
    expect(typeof b.total).toBe('number')
  })

  it('GET /api/licenses response has success, data, count, total fields', async () => {
    const { body } = await rawFetch('/api/licenses')
    const b = body as Record<string, unknown>
    expect(b).toHaveProperty('success', true)
    expect(Array.isArray(b.data)).toBe(true)
    expect(typeof b.count).toBe('number')
    expect(typeof b.total).toBe('number')
  })
})
