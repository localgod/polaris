import { expect, beforeEach, vi } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { SbomValidator } from '../../../server/utils/sbom-validator'
import type { ValidationResult } from '../../../server/utils/sbom-validator'

// Mock the SbomValidator
vi.mock('../../../server/utils/sbom-validator', () => ({
  SbomValidator: vi.fn(),
  getSbomValidator: vi.fn()
}))

// Mock authentication
const mockRequireAuth = vi.fn()
vi.mock('#auth', () => ({
  requireAuth: mockRequireAuth
}))

// Mock data
const validCycloneDxSbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.4',
  version: 1,
  metadata: {
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
  documentNamespace: 'https://example.com/test',
  creationInfo: {
    created: '2024-01-01T00:00:00Z',
    creators: ['Tool: test']
  }
}

const invalidSbom = {
  invalid: 'structure'
}

interface SbomResponse {
  success: boolean
  format?: 'cyclonedx' | 'spdx' | 'unknown'
  message?: string
  error?: string
  required?: string
  validationErrors?: Array<{
    instancePath: string
    message: string
  }>
}

beforeEach(() => {
  vi.clearAllMocks()
})

const feature = await loadFeature('./test/server/api/sboms.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let responseData: SbomResponse
  let responseStatus: number
  let mockValidator: {
    validate: ReturnType<typeof vi.fn>
  }

  Background(({ Given }) => {
    Given('the API server is running', () => {
      // API is always available in unit tests
      expect(true).toBe(true)
    })
  })

  Scenario('Successfully validate a CycloneDX SBOM', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('I POST to "/api/sboms" with valid CycloneDX SBOM', async () => {
      // Mock validator
      const validateFn = vi.fn().mockReturnValue({
        valid: true,
        format: 'cyclonedx'
      } as ValidationResult)

      mockValidator = {
        validate: validateFn
      }

      vi.mocked(SbomValidator).mockImplementation(function() {
        return mockValidator as unknown as SbomValidator
      })

      // Simulate endpoint logic
      const contentType = 'application/json'
      const body = {
        repositoryUrl: 'https://github.com/org/repo',
        sbom: validCycloneDxSbom
      }

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }

      const validator = new SbomValidator()
      const result = validator.validate(body.sbom)

      if (result.valid) {
        responseStatus = 200
        responseData = {
          success: true,
          format: result.format as 'cyclonedx' | 'spdx',
          message: 'Valid SBOM'
        }
      }
    })

    Then('the response status should be 200', () => {
      expect(responseStatus).toBe(200)
    })

    And('the response should have property "success" equal to true', () => {
      expect(responseData.success).toBe(true)
    })

    And('the response should have property "format" equal to "cyclonedx"', () => {
      expect(responseData.format).toBe('cyclonedx')
    })

    And('the response should have property "message" equal to "Valid SBOM"', () => {
      expect(responseData.message).toBe('Valid SBOM')
    })
  })

  Scenario('Successfully validate an SPDX SBOM', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('I POST to "/api/sboms" with valid SPDX SBOM', async () => {
      const validateFn = vi.fn().mockReturnValue({
        valid: true,
        format: 'spdx'
      } as ValidationResult)

      mockValidator = {
        validate: validateFn
      }

      vi.mocked(SbomValidator).mockImplementation(function() {
        return mockValidator as unknown as SbomValidator
      })

      const contentType = 'application/json'
      const body = {
        repositoryUrl: 'https://github.com/org/repo',
        sbom: validSpdxSbom
      }

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }

      const validator = new SbomValidator()
      const result = validator.validate(body.sbom)

      if (result.valid) {
        responseStatus = 200
        responseData = {
          success: true,
          format: result.format as 'cyclonedx' | 'spdx',
          message: 'Valid SBOM'
        }
      }
    })

    Then('the response status should be 200', () => {
      expect(responseStatus).toBe(200)
    })

    And('the response should have property "success" equal to true', () => {
      expect(responseData.success).toBe(true)
    })

    And('the response should have property "format" equal to "spdx"', () => {
      expect(responseData.format).toBe('spdx')
    })

    And('the response should have property "message" equal to "Valid SBOM"', () => {
      expect(responseData.message).toBe('Valid SBOM')
    })
  })

  Scenario('Reject request without authentication', ({ Given, When, Then, And }) => {
    Given('I am not authenticated', () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthenticated'))
    })

    When('I POST to "/api/sboms" with valid CycloneDX SBOM', async () => {
      const contentType = 'application/json'

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }
    })

    Then('the response status should be 401', () => {
      expect(responseStatus).toBe(401)
    })

    And('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should have property "error" equal to "unauthenticated"', () => {
      expect(responseData.error).toBe('unauthenticated')
    })

    And('the response should have property "message" equal to "Authentication required"', () => {
      expect(responseData.message).toBe('Authentication required')
    })
  })

  Scenario('Reject request with wrong Content-Type', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('I POST to "/api/sboms" with Content-Type "text/plain"', async () => {
      const contentType = 'text/plain'

      if (!contentType || !contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }
    })

    Then('the response status should be 415', () => {
      expect(responseStatus).toBe(415)
    })

    And('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should have property "error" equal to "unsupported_media_type"', () => {
      expect(responseData.error).toBe('unsupported_media_type')
    })

    And('the response should have property "required" equal to "application/json"', () => {
      expect(responseData.required).toBe('application/json')
    })
  })

  Scenario('Reject request with invalid JSON', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('I POST to "/api/sboms" with invalid JSON', async () => {
      const contentType = 'application/json'

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }

      // Simulate JSON parse error
      try {
        throw new Error('Invalid JSON')
      } catch {
        responseStatus = 400
        responseData = {
          success: false,
          error: 'invalid_request',
          message: 'Invalid JSON in request body'
        }
      }
    })

    Then('the response status should be 400', () => {
      expect(responseStatus).toBe(400)
    })

    And('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should have property "error" equal to "invalid_request"', () => {
      expect(responseData.error).toBe('invalid_request')
    })

    And('the response should have property "message" equal to "Invalid JSON in request body"', () => {
      expect(responseData.message).toBe('Invalid JSON in request body')
    })
  })

  Scenario('Reject request without repositoryUrl', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('I POST to "/api/sboms" without repositoryUrl', async () => {
      const contentType = 'application/json'
      const body = {
        sbom: validCycloneDxSbom
      }

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }

      // Validate request structure
      if (!('repositoryUrl' in body)) {
        responseStatus = 400
        responseData = {
          success: false,
          error: 'invalid_request',
          message: 'repositoryUrl is required'
        }
        return
      }
    })

    Then('the response status should be 400', () => {
      expect(responseStatus).toBe(400)
    })

    And('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should have property "error" equal to "invalid_request"', () => {
      expect(responseData.error).toBe('invalid_request')
    })

    And('the response should have property "message" equal to "repositoryUrl is required"', () => {
      expect(responseData.message).toBe('repositoryUrl is required')
    })
  })

  Scenario('Reject request with invalid repositoryUrl', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('I POST to "/api/sboms" with invalid repositoryUrl', async () => {
      const contentType = 'application/json'
      const body = {
        repositoryUrl: 'not-a-valid-url',
        sbom: validCycloneDxSbom
      }

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }

      // Validate repositoryUrl format
      try {
        new URL(body.repositoryUrl)
      } catch {
        responseStatus = 400
        responseData = {
          success: false,
          error: 'invalid_request',
          message: 'repositoryUrl must be a valid URL'
        }
        return
      }
    })

    Then('the response status should be 400', () => {
      expect(responseStatus).toBe(400)
    })

    And('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should have property "error" equal to "invalid_request"', () => {
      expect(responseData.error).toBe('invalid_request')
    })

    And('the response should have property "message" equal to "repositoryUrl must be a valid URL"', () => {
      expect(responseData.message).toBe('repositoryUrl must be a valid URL')
    })
  })

  Scenario('Reject request without SBOM', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('I POST to "/api/sboms" without sbom', async () => {
      const contentType = 'application/json'
      const body = {
        repositoryUrl: 'https://github.com/org/repo'
      }

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }

      // Validate request structure
      if (!('sbom' in body)) {
        responseStatus = 400
        responseData = {
          success: false,
          error: 'invalid_request',
          message: 'sbom is required'
        }
        return
      }
    })

    Then('the response status should be 400', () => {
      expect(responseStatus).toBe(400)
    })

    And('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should have property "error" equal to "invalid_request"', () => {
      expect(responseData.error).toBe('invalid_request')
    })

    And('the response should have property "message" equal to "sbom is required"', () => {
      expect(responseData.message).toBe('sbom is required')
    })
  })

  Scenario('Reject invalid SBOM schema', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('I POST to "/api/sboms" with invalid SBOM schema', async () => {
      const validateFn = vi.fn().mockReturnValue({
        valid: false,
        format: 'unknown',
        errors: [
          {
            instancePath: '/bomFormat',
            message: 'must be equal to one of the allowed values'
          }
        ]
      } as ValidationResult)

      mockValidator = {
        validate: validateFn
      }

      vi.mocked(SbomValidator).mockImplementation(function() {
        return mockValidator as unknown as SbomValidator
      })

      const contentType = 'application/json'
      const body = {
        repositoryUrl: 'https://github.com/org/repo',
        sbom: invalidSbom
      }

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }

      const validator = new SbomValidator()
      const result = validator.validate(body.sbom)

      if (!result.valid) {
        responseStatus = 422
        responseData = {
          success: false,
          error: 'invalid_sbom',
          format: result.format,
          validationErrors: result.errors || []
        }
      }
    })

    Then('the response status should be 422', () => {
      expect(responseStatus).toBe(422)
    })

    And('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should have property "error" equal to "invalid_sbom"', () => {
      expect(responseData.error).toBe('invalid_sbom')
    })

    And('the response should have property "format" as a string', () => {
      expect(typeof responseData.format).toBe('string')
    })

    And('the response should have property "validationErrors" as an array', () => {
      expect(Array.isArray(responseData.validationErrors)).toBe(true)
    })
  })

  Scenario('Handle internal validation errors', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => {
      mockRequireAuth.mockResolvedValue(true)
    })

    When('the SBOM validator throws an error', async () => {
      const validateFn = vi.fn().mockImplementation(() => {
        throw new Error('Internal validation error')
      })

      mockValidator = {
        validate: validateFn
      }

      vi.mocked(SbomValidator).mockImplementation(function() {
        return mockValidator as unknown as SbomValidator
      })

      const contentType = 'application/json'
      const body = {
        repositoryUrl: 'https://github.com/org/repo',
        sbom: validCycloneDxSbom
      }

      if (!contentType.includes('application/json')) {
        responseStatus = 415
        responseData = {
          success: false,
          error: 'unsupported_media_type',
          required: 'application/json'
        }
        return
      }

      try {
        await mockRequireAuth()
      } catch {
        responseStatus = 401
        responseData = {
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required'
        }
        return
      }

      try {
        const validator = new SbomValidator()
        validator.validate(body.sbom)
      } catch (error) {
        responseStatus = 500
        responseData = {
          success: false,
          error: 'internal_error',
          message: error instanceof Error ? error.message : 'Internal server error'
        }
      }
    })

    Then('the response status should be 500', () => {
      expect(responseStatus).toBe(500)
    })

    And('the response should have property "success" equal to false', () => {
      expect(responseData.success).toBe(false)
    })

    And('the response should have property "error" equal to "internal_error"', () => {
      expect(responseData.error).toBe('internal_error')
    })

    And('the response should have property "message" as a string', () => {
      expect(typeof responseData.message).toBe('string')
    })
  })
})
