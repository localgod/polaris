import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Unmapped Components API', async () => {
  await setup({
    server: true,
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
        expect(component).toHaveProperty('name')
        expect(component).toHaveProperty('version')
        expect(component).toHaveProperty('packageManager')
        expect(component).toHaveProperty('systems')
        expect(component).toHaveProperty('systemCount')
      }
    })
  })

  describe('GET /api/systems/[name]/unmapped-components', () => {
    it('should return unmapped components for a specific system', async () => {
      const response = await $fetch('/api/systems/api-gateway/unmapped-components')
      
      expect(response).toBeDefined()
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.system).toBe('api-gateway')
      expect(response.data.components).toBeInstanceOf(Array)
      expect(response.data.count).toBeGreaterThanOrEqual(0)
    })

    it('should return 404 for non-existent system', async () => {
      try {
        await $fetch('/api/systems/non-existent-system/unmapped-components')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as { statusCode: number }).statusCode).toBe(404)
      }
    })

    it('should return components with required fields', async () => {
      const response = await $fetch('/api/systems/api-gateway/unmapped-components')
      
      if (response.data.components.length > 0) {
        const component = response.data.components[0]
        expect(component).toHaveProperty('name')
        expect(component).toHaveProperty('version')
        expect(component).toHaveProperty('packageManager')
        expect(component).toHaveProperty('hash')
      }
    })

    it('should handle URL-encoded system names', async () => {
      const systemName = 'api-gateway'
      const encodedName = encodeURIComponent(systemName)
      const response = await $fetch(`/api/systems/${encodedName}/unmapped-components`)
      
      expect(response.success).toBe(true)
      expect(response.data.system).toBe(systemName)
    })
  })
})
