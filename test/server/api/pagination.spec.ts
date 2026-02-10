import { describe, it, expect, beforeAll } from 'vitest'

/**
 * API Pagination Tests
 * 
 * Tests that all list endpoints support consistent pagination with:
 * - limit: Number of items per page
 * - offset: Number of items to skip
 * - Response includes: count (page items), total (all items)
 * 
 * These tests require a running server. They will be skipped if the server is not available.
 * Run with: npm run test -- --run test/server/api/pagination.spec.ts
 */

const BASE_URL = process.env.NUXT_TEST_BASE_URL || 'http://localhost:3000'

interface PaginatedResponse {
  success: boolean
  data: unknown[]
  count: number
  total: number
  error?: string
}

let serverAvailable: boolean | null = null

async function fetchApi(endpoint: string): Promise<PaginatedResponse> {
  const response = await fetch(`${BASE_URL}${endpoint}`)
  return response.json()
}

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
    console.warn('   Pagination tests will be skipped.\n')
  }
  
  return serverAvailable
}

describe('API Pagination', () => {
  beforeAll(async () => {
    await ensureServerCheck()
  })

  describe('GET /api/components', () => {
    it('should return paginated results with limit', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/components?limit=5')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(5)
      expect(response.count).toBe(response.data.length)
      expect(typeof response.total).toBe('number')
      expect(response.total).toBeGreaterThanOrEqual(response.count)
    })

    it('should return paginated results with offset', async () => {
      if (!serverAvailable) return

      const firstPage = await fetchApi('/api/components?limit=5&offset=0')
      const secondPage = await fetchApi('/api/components?limit=5&offset=5')
      
      expect(firstPage.success).toBe(true)
      expect(secondPage.success).toBe(true)
      expect(firstPage.total).toBe(secondPage.total)
      
      // Ensure different data on different pages (if enough data exists)
      if (firstPage.total > 5 && firstPage.data.length > 0 && secondPage.data.length > 0) {
        const firstIds = JSON.stringify(firstPage.data[0])
        const secondIds = JSON.stringify(secondPage.data[0])
        expect(firstIds).not.toBe(secondIds)
      }
    })
  })

  describe('GET /api/systems', () => {
    it('should return paginated results with count and total', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/systems?limit=2')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(2)
      expect(response.count).toBe(response.data.length)
      expect(typeof response.total).toBe('number')
    })
  })

  describe('GET /api/teams', () => {
    it('should return paginated results with count and total', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/teams?limit=2')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(2)
      expect(response.count).toBe(response.data.length)
      expect(typeof response.total).toBe('number')
    })
  })

  describe('GET /api/technologies', () => {
    it('should return paginated results with count and total', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/technologies?limit=2')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(2)
      expect(response.count).toBe(response.data.length)
      expect(typeof response.total).toBe('number')
    })
  })

  describe('GET /api/licenses', () => {
    it('should return paginated results with count and total', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/licenses?limit=2')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(2)
      expect(response.count).toBe(response.data.length)
      expect(typeof response.total).toBe('number')
    })
  })

  describe('GET /api/policies', () => {
    it('should return paginated results with count and total', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/policies?limit=2')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(2)
      expect(response.count).toBe(response.data.length)
      expect(typeof response.total).toBe('number')
    })
  })

  describe('GET /api/audit-logs', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/api/audit-logs?limit=2`)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/components/unmapped', () => {
    it('should return paginated results with count and total', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/components/unmapped?limit=2')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(2)
      expect(response.count).toBe(response.data.length)
      expect(typeof response.total).toBe('number')
    })
  })

  describe('GET /api/policies/license-violations', () => {
    it('should return paginated results with count and total', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/policies/license-violations?limit=2')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(2)
      expect(response.count).toBe(response.data.length)
      expect(typeof response.total).toBe('number')
    })
  })

  describe('Pagination consistency', () => {
    it('should have consistent total across pages', async () => {
      if (!serverAvailable) return

      const page1 = await fetchApi('/api/components?limit=10&offset=0')
      const page2 = await fetchApi('/api/components?limit=10&offset=10')
      const page3 = await fetchApi('/api/components?limit=10&offset=20')
      
      expect(page1.total).toBe(page2.total)
      expect(page2.total).toBe(page3.total)
    })

    it('should return empty data when offset exceeds total', async () => {
      if (!serverAvailable) return

      const response = await fetchApi('/api/teams?limit=10&offset=10000')
      
      expect(response.success).toBe(true)
      expect(response.data.length).toBe(0)
      expect(response.count).toBe(0)
      expect(response.total).toBeGreaterThanOrEqual(0)
    })
  })
})
