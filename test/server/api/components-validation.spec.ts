import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Tests for /components endpoint input validation.
 *
 * Requires a running server. Skipped automatically if unavailable.
 * Run with: npm run test -- --run test/server/api/components-validation.spec.ts
 */

const BASE_URL = process.env.NUXT_TEST_BASE_URL || 'http://localhost:3000'

let serverAvailable: boolean | null = null

async function ensureServerCheck(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable

  try {
    const response = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) })
    serverAvailable = response.ok
  } catch {
    serverAvailable = false
  }

  if (!serverAvailable) {
    console.warn('\n⚠️  Server not available at', BASE_URL)
    console.warn('   Validation tests will be skipped.\n')
  }

  return serverAvailable
}

describe('Components API - Input Validation', () => {
  beforeAll(async () => {
    await ensureServerCheck()
  })

  describe('GET /api/components', () => {
    it('should return 400 for non-numeric limit', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/components?limit=abc`)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toBeDefined()
    })

    it('should return 400 for non-numeric offset', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/components?offset=xyz`)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it('should clamp negative limit to 1', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/components?limit=-5`)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should clamp limit above 200 to 200', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/components?limit=999`)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.length).toBeLessThanOrEqual(200)
    })

    it('should clamp negative offset to 0', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/components?offset=-10`)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('GET /api/components/unmapped', () => {
    it('should return 400 for non-numeric limit', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/components/unmapped?limit=abc`)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it('should return 400 for non-numeric offset', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/components/unmapped?offset=xyz`)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it('should clamp negative limit to 1', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/components/unmapped?limit=-5`)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })
})
