import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Unmapped Components API', async () => {
  await setup({
    server: true,
    browser: false,
    setupTimeout: 120000, // 2 minutes for server startup
  })

  describe('GET /api/components/unmapped', () => {
    it('should return unmapped components', async () => {
      const response = await $fetch('/api/components/unmapped')
      
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
      expect(response.data).toBeInstanceOf(Array)
      expect(response.count).toBeGreaterThanOrEqual(0)
    })

    it('should return components with required fields', async () => {
      const response = await $fetch('/api/components/unmapped')
      
      if (response.data.length > 0) {
        const component = response.data[0]
        // Core identification fields
        expect(component).toHaveProperty('name')
        expect(component).toHaveProperty('version')
        expect(component).toHaveProperty('packageManager')
        
        // New SBOM fields
        expect(component).toHaveProperty('purl')
        expect(component).toHaveProperty('hashes')
        expect(component).toHaveProperty('licenses')
        expect(component.hashes).toBeInstanceOf(Array)
        expect(component.licenses).toBeInstanceOf(Array)
        
        // Relationship fields
        expect(component).toHaveProperty('systems')
        expect(component).toHaveProperty('systemCount')
        expect(component.systems).toBeInstanceOf(Array)
        expect(typeof component.systemCount).toBe('number')
      }
    })
  })

  describe('GET /api/systems/[name]/unmapped-components', () => {
    it('should return unmapped components for a specific system', async () => {
      // First get list of systems to find one that exists
      const systemsResponse = await $fetch('/api/systems')
      
      if (!systemsResponse.success || systemsResponse.data.length === 0) {
        // No systems in database, skip this test
        console.log('   ⏭️  Skipping - no systems in database')
        return
      }

      const systemName = systemsResponse.data[0].name
      const response = await $fetch(`/api/systems/${encodeURIComponent(systemName)}/unmapped-components`)
      
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.system).toBe(systemName)
      expect(response.data.components).toBeInstanceOf(Array)
      expect(response.data.count).toBeGreaterThanOrEqual(0)
    })

    it('should return 404 for non-existent system', async () => {
      try {
        await $fetch('/api/systems/non-existent-system-xyz-123/unmapped-components')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as { statusCode: number }).statusCode).toBe(404)
      }
    })

    it('should return components with required fields', async () => {
      // First get list of systems to find one that exists
      const systemsResponse = await $fetch('/api/systems')
      
      if (!systemsResponse.success || systemsResponse.data.length === 0) {
        console.log('   ⏭️  Skipping - no systems in database')
        return
      }

      const systemName = systemsResponse.data[0].name
      const response = await $fetch(`/api/systems/${encodeURIComponent(systemName)}/unmapped-components`)
      
      if (response.data.components.length > 0) {
        const component = response.data.components[0]
        // Core identification fields
        expect(component).toHaveProperty('name')
        expect(component).toHaveProperty('version')
        expect(component).toHaveProperty('packageManager')
        
        // New SBOM fields
        expect(component).toHaveProperty('purl')
        expect(component).toHaveProperty('hashes')
        expect(component).toHaveProperty('licenses')
        expect(component.hashes).toBeInstanceOf(Array)
        expect(component.licenses).toBeInstanceOf(Array)
      }
    })

    it('should handle URL-encoded system names', async () => {
      // First get list of systems to find one that exists
      const systemsResponse = await $fetch('/api/systems')
      
      if (!systemsResponse.success || systemsResponse.data.length === 0) {
        console.log('   ⏭️  Skipping - no systems in database')
        return
      }

      const systemName = systemsResponse.data[0].name
      const encodedName = encodeURIComponent(systemName)
      const response = await $fetch(`/api/systems/${encodedName}/unmapped-components`)
      
      expect(response.success).toBe(true)
      expect(response.data.system).toBe(systemName)
    })
  })
})
