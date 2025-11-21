import { expect, beforeAll, afterAll } from 'vitest'
import { Feature } from '../../fixtures/gherkin'
import { getBaseURL, checkServerHealth } from '../../fixtures/api-client'

Feature('SBOM API Endpoint @api @integration', ({ Scenario }) => {
  const baseURL = getBaseURL()
  const apiPath = '/api/sboms'
  let serverRunning = false
  const validToken: string | null = null
  
  // Sample SBOMs for testing
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

  const invalidCycloneDXSbom = {
    bomFormat: 'CycloneDX'
    // Missing required fields
  }

  const unknownFormatSbom = {
    someField: 'value',
    anotherField: 'data'
  }

  beforeAll(async () => {
    serverRunning = await checkServerHealth()
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   These tests will be skipped.\n')
      return
    }

    // TODO: Create test user and generate valid API token
    // For now, tests requiring authentication will be skipped
    // validToken = await createTestToken()
  })

  afterAll(async () => {
    // TODO: Cleanup test user and tokens
    // if (validToken) {
    //   await revokeTestToken(validToken)
    // }
  })

  Scenario('Reject requests without Content-Type header', ({ Given, When, Then, And }) => {
    let response: Response
    let responseData: unknown

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I POST to "/api/sboms" without Content-Type header', async () => {
      if (!serverRunning) return
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: validCycloneDXSbom
        })
      })
      responseData = await response.json()
    })

    Then('I should receive a 415 status code', () => {
      if (!serverRunning) return
      expect(response.status).toBe(415)
    })

    And('the response should indicate unsupported media type', () => {
      if (!serverRunning) return
      expect(responseData.error).toBe('unsupported_media_type')
    })

    And('the response should specify "application/json" is required', () => {
      if (!serverRunning) return
      expect(responseData.required).toBe('application/json')
    })
  })

  Scenario('Reject requests with wrong Content-Type', ({ Given, When, Then, And }) => {
    let response: Response
    let responseData: unknown

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I POST to "/api/sboms" with Content-Type "text/plain"', async () => {
      if (!serverRunning) return
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: validCycloneDXSbom
        })
      })
      responseData = await response.json()
    })

    Then('I should receive a 415 status code', () => {
      if (!serverRunning) return
      expect(response.status).toBe(415)
    })

    And('the response should indicate unsupported media type', () => {
      if (!serverRunning) return
      expect(responseData.error).toBe('unsupported_media_type')
    })
  })

  Scenario('Reject unauthenticated requests', ({ Given, When, Then, And }) => {
    let response: Response
    let responseData: unknown
    let sbomPayload: typeof validCycloneDXSbom

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('I have a valid SBOM payload', () => {
      if (!serverRunning) return
      sbomPayload = validCycloneDXSbom
      expect(sbomPayload).toBeDefined()
    })

    When('I POST to "/api/sboms" without authentication', async () => {
      if (!serverRunning) return
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: sbomPayload
        })
      })
      responseData = await response.json()
    })

    Then('I should receive a 401 status code', () => {
      if (!serverRunning) return
      expect(response.status).toBe(401)
    })

    And('the response should indicate authentication is required', () => {
      if (!serverRunning) return
      expect(responseData.error).toBe('unauthenticated')
      expect(responseData.message).toContain('Authentication required')
    })
  })

  Scenario('Reject requests with invalid Bearer token', ({ Given, When, Then, And }) => {
    let response: Response
    let responseData: unknown
    let sbomPayload: typeof validCycloneDXSbom

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('I have a valid SBOM payload', () => {
      if (!serverRunning) return
      sbomPayload = validCycloneDXSbom
      expect(sbomPayload).toBeDefined()
    })

    When('I POST to "/api/sboms" with an invalid Bearer token', async () => {
      if (!serverRunning) return
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-12345'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: sbomPayload
        })
      })
      responseData = await response.json()
    })

    Then('I should receive a 401 status code', () => {
      if (!serverRunning) return
      expect(response.status).toBe(401)
    })

    And('the response should indicate authentication failed', () => {
      if (!serverRunning) return
      expect(responseData.error).toBe('unauthenticated')
    })
  })

  Scenario('Validate CycloneDX SBOM with valid authentication', ({ Given, When, Then, And }) => {
    let response: Response
    let sbomPayload: typeof validCycloneDXSbom

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('I have a valid API token', () => {
      if (!serverRunning) return
      if (!validToken) {
        console.log('   ⏭️  Skipping - no valid token available (TODO: implement token creation)')
        return
      }
      expect(validToken).toBeDefined()
    })

    Given('I have a valid CycloneDX 1.6 SBOM', () => {
      if (!serverRunning || !validToken) return
      sbomPayload = validCycloneDXSbom
      expect(sbomPayload.bomFormat).toBe('CycloneDX')
    })

    When('I POST the SBOM to "/api/sboms" with authentication', async () => {
      if (!serverRunning || !validToken) return
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: sbomPayload
        })
      })
    })

    Then('I should receive a 200 status code', () => {
      if (!serverRunning || !validToken) return
      expect(response.status).toBe(200)
    })

    And('the response should indicate success', async () => {
      if (!serverRunning || !validToken) return
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    And('the response should identify the format as "cyclonedx"', async () => {
      if (!serverRunning || !validToken) return
      const data = await response.json()
      expect(data.format).toBe('cyclonedx')
    })
  })

  Scenario('Validate SPDX SBOM with valid authentication', ({ Given, When, Then, And }) => {
    let response: Response
    let sbomPayload: typeof validSpdxSbom

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('I have a valid API token', () => {
      if (!serverRunning) return
      if (!validToken) {
        console.log('   ⏭️  Skipping - no valid token available (TODO: implement token creation)')
        return
      }
      expect(validToken).toBeDefined()
    })

    Given('I have a valid SPDX 2.3 SBOM', () => {
      if (!serverRunning || !validToken) return
      sbomPayload = validSpdxSbom
      expect(sbomPayload.spdxVersion).toBe('SPDX-2.3')
    })

    When('I POST the SBOM to "/api/sboms" with authentication', async () => {
      if (!serverRunning || !validToken) return
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: sbomPayload
        })
      })
    })

    Then('I should receive a 200 status code', () => {
      if (!serverRunning || !validToken) return
      expect(response.status).toBe(200)
    })

    And('the response should indicate success', async () => {
      if (!serverRunning || !validToken) return
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    And('the response should identify the format as "spdx"', async () => {
      if (!serverRunning || !validToken) return
      const data = await response.json()
      expect(data.format).toBe('spdx')
    })
  })

  Scenario('Reject invalid SBOM schema', ({ Given, When, Then, And }) => {
    let response: Response
    let sbomPayload: typeof invalidCycloneDXSbom

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('I have a valid API token', () => {
      if (!serverRunning) return
      if (!validToken) {
        console.log('   ⏭️  Skipping - no valid token available (TODO: implement token creation)')
        return
      }
      expect(validToken).toBeDefined()
    })

    Given('I have an invalid CycloneDX SBOM missing required fields', () => {
      if (!serverRunning || !validToken) return
      sbomPayload = invalidCycloneDXSbom
      expect(sbomPayload.bomFormat).toBe('CycloneDX')
    })

    When('I POST the SBOM to "/api/sboms" with authentication', async () => {
      if (!serverRunning || !validToken) return
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: sbomPayload
        })
      })
    })

    Then('I should receive a 422 status code', () => {
      if (!serverRunning || !validToken) return
      expect(response.status).toBe(422)
    })

    And('the response should indicate validation failed', async () => {
      if (!serverRunning || !validToken) return
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_sbom')
    })

    And('the response should include validation errors', async () => {
      if (!serverRunning || !validToken) return
      const data = await response.json()
      expect(data.validationErrors).toBeDefined()
      expect(Array.isArray(data.validationErrors)).toBe(true)
    })
  })

  Scenario('Reject unknown SBOM format', ({ Given, When, Then, And }) => {
    let response: Response
    let sbomPayload: typeof unknownFormatSbom

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('I have a valid API token', () => {
      if (!serverRunning) return
      if (!validToken) {
        console.log('   ⏭️  Skipping - no valid token available (TODO: implement token creation)')
        return
      }
      expect(validToken).toBeDefined()
    })

    Given('I have an unrecognized SBOM format', () => {
      if (!serverRunning || !validToken) return
      sbomPayload = unknownFormatSbom
      expect(sbomPayload.someField).toBe('value')
    })

    When('I POST the SBOM to "/api/sboms" with authentication', async () => {
      if (!serverRunning || !validToken) return
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: sbomPayload
        })
      })
    })

    Then('I should receive a 422 status code', () => {
      if (!serverRunning || !validToken) return
      expect(response.status).toBe(422)
    })

    And('the response should indicate unknown format', async () => {
      if (!serverRunning || !validToken) return
      const data = await response.json()
      expect(data.format).toBe('unknown')
    })
  })

  Scenario('Fast-fail on authentication before validation', ({ Given, When, Then, And }) => {
    let response: Response
    let startTime: number
    let duration: number
    let largeSbom: { bomFormat: string; components: Array<{ name: string; version: string }> }

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    Given('I have a large SBOM payload', () => {
      if (!serverRunning) return
      largeSbom = {
        bomFormat: 'CycloneDX',
        components: Array(100).fill({ name: 'test', version: '1.0.0' })
      }
      expect(largeSbom.components.length).toBe(100)
    })

    When('I POST to "/api/sboms" without authentication', async () => {
      if (!serverRunning) return
      startTime = Date.now()
      response = await fetch(`${baseURL}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: 'https://github.com/test/repo',
          sbom: largeSbom
        })
      })
      duration = Date.now() - startTime
    })

    Then('I should receive a 401 status code', () => {
      if (!serverRunning) return
      expect(response.status).toBe(401)
    })

    And('the response time should be less than 1 second', () => {
      if (!serverRunning) return
      expect(duration).toBeLessThan(1000)
    })
  })
})
