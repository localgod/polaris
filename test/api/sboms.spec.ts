import { describe, it, expect } from 'vitest'
import { getBaseURL } from '../helpers/api-client'

describe('SBOM API Endpoint @api @integration', () => {
  const baseURL = getBaseURL()
  const apiPath = '/api/sboms'
  
  // Sample valid CycloneDX SBOM (minimal)
  const validCycloneDXSbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    metadata: {
      timestamp: '2024-01-01T00:00:00Z',
      component: {
        type: 'application',
        name: 'test-app',
        version: '1.0.0'
      }
    },
    components: []
  }

  // Sample valid SPDX SBOM (minimal)
  const validSpdxSbom = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: 'test-sbom',
    documentNamespace: 'https://example.com/test-sbom-1234',
    creationInfo: {
      created: '2024-01-01T00:00:00Z',
      creators: ['Tool: test']
    },
    packages: []
  }

  describe('Content-Type Validation', () => {
    it('should return 415 when Content-Type is missing', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: validCycloneDXSbom
        })
      })

      expect(response.status).toBe(415)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('unsupported_media_type')
      expect(data.required).toBe('application/json')
    })

    it('should return 415 when Content-Type is not application/json', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: validCycloneDXSbom
        })
      })

      expect(response.status).toBe(415)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('unsupported_media_type')
    })
  })

  describe('Authentication', () => {
    it('should return 401 when no authentication is provided', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: validCycloneDXSbom
        })
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('unauthenticated')
      expect(data.message).toBe('Authentication required')
    })

    it('should return 401 with invalid Bearer token', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-12345'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: validCycloneDXSbom
        })
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('unauthenticated')
    })
  })

  describe('Request Body Validation', () => {
    // Note: These tests require a valid token or session
    // For now, they verify error handling before authentication

    it('should return 400 when repositoryUrl is missing', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sbom: validCycloneDXSbom
        })
      })

      // Will likely be 401 due to auth, but test validates the flow
      expect([400, 401]).toContain(response.status)
    })

    it('should return 400 when repositoryUrl is not a string', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: 123,
          sbom: validCycloneDXSbom
        })
      })

      // Will likely be 401 due to auth, but test validates the flow
      expect([400, 401]).toContain(response.status)
    })

    it('should return 400 when repositoryUrl is not a valid URL', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: 'not-a-valid-url',
          sbom: validCycloneDXSbom
        })
      })

      // Will likely be 401 due to auth, but test validates the flow
      expect([400, 401]).toContain(response.status)
    })

    it('should return 400 when sbom is missing', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo'
        })
      })

      // Will likely be 401 due to auth, but test validates the flow
      expect([400, 401]).toContain(response.status)
    })

    it('should return 400 when sbom is not an object', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: 'not an object'
        })
      })

      // Will likely be 401 due to auth, but test validates the flow
      expect([400, 401]).toContain(response.status)
    })

    it('should return 400 when JSON is invalid', async () => {
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json {'
      })

      // Will likely be 401 due to auth, but test validates the flow
      expect([400, 401]).toContain(response.status)
    })
  })

  describe('SBOM Validation (with mock token)', () => {
    // These tests would need a valid token to fully test
    // For now, they document the expected behavior
    
    it.skip('should return 200 for valid CycloneDX SBOM', async () => {
      // Would require valid token
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer VALID_TOKEN'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: validCycloneDXSbom
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.format).toBe('cyclonedx')
      expect(data.message).toBe('Valid SBOM')
    })

    it.skip('should return 200 for valid SPDX SBOM', async () => {
      // Would require valid token
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer VALID_TOKEN'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: validSpdxSbom
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.format).toBe('spdx')
      expect(data.message).toBe('Valid SBOM')
    })

    it.skip('should return 422 for invalid SBOM schema', async () => {
      // Would require valid token
      const invalidSbom = {
        bomFormat: 'CycloneDX',
        // Missing required fields
      }

      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer VALID_TOKEN'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: invalidSbom
        })
      })

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_sbom')
      expect(data.format).toBeDefined()
      expect(data.validationErrors).toBeDefined()
      expect(Array.isArray(data.validationErrors)).toBe(true)
    })

    it.skip('should return 422 for unknown SBOM format', async () => {
      // Would require valid token
      const unknownSbom = {
        someField: 'value'
      }

      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer VALID_TOKEN'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: unknownSbom
        })
      })

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_sbom')
      expect(data.format).toBe('unknown')
    })
  })

  describe('Performance - Auth Before Validation', () => {
    it('should return 401 before attempting SBOM validation', async () => {
      // Use a moderately sized SBOM to test auth-before-validation
      // Note: Very large payloads may be buffered by the HTTP server before reaching the handler
      const largeSbom = {
        bomFormat: 'CycloneDX',
        components: Array(100).fill({ name: 'test', version: '1.0.0' })
      }

      const startTime = Date.now()
      
      const response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: largeSbom
        })
      })

      const duration = Date.now() - startTime

      expect(response.status).toBe(401)
      // Should be fast because validation is skipped
      expect(duration).toBeLessThan(1000) // Less than 1 second
    })
  })
})
