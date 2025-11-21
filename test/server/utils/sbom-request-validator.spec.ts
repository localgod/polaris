import { expect } from 'vitest'
import { Feature } from '../../fixtures/gherkin'
import {
  validateRepositoryUrl,
  validateSbomStructure,
  validateSbomRequest,
  type ValidationResult,
  type SbomRequest
} from '../../../server/utils/sbom-request-validator'

Feature('SBOM Request Validation @helpers @unit', ({ Scenario }) => {
  let validationResult: ValidationResult
  let requestBody: Partial<SbomRequest>

  Scenario('Validate missing repositoryUrl', ({ Given, When, Then, And }) => {
    Given('the SBOM request validator is initialized', () => {
      // Validator is stateless, no initialization needed
      expect(validateSbomRequest).toBeDefined()
    })

    Given('a request body without repositoryUrl', () => {
      requestBody = { sbom: {} }
    })

    When('I validate the request', () => {
      validationResult = validateSbomRequest(requestBody as SbomRequest)
    })

    Then('the validation should fail', () => {
      expect(validationResult.valid).toBe(false)
    })

    And('the error should indicate repositoryUrl is required', () => {
      expect(validationResult.error?.message).toContain('repositoryUrl is required')
    })
  })

  Scenario('Validate non-string repositoryUrl', ({ Given, When, Then, And }) => {
    Given('the SBOM request validator is initialized', () => {
      expect(validateSbomRequest).toBeDefined()
    })

    Given('a request body with repositoryUrl as a number', () => {
      requestBody = { repositoryUrl: 123, sbom: {} }
    })

    When('I validate the request', () => {
      validationResult = validateSbomRequest(requestBody as SbomRequest)
    })

    Then('the validation should fail', () => {
      expect(validationResult.valid).toBe(false)
    })

    And('the error should indicate repositoryUrl must be a string', () => {
      expect(validationResult.error?.message).toContain('must be a string')
    })
  })

  Scenario('Validate invalid URL format', ({ Given, When, Then, And }) => {
    Given('the SBOM request validator is initialized', () => {
      expect(validateSbomRequest).toBeDefined()
    })

    Given('a request body with repositoryUrl "not-a-valid-url"', () => {
      requestBody = { repositoryUrl: 'not-a-valid-url', sbom: {} }
    })

    When('I validate the request', () => {
      validationResult = validateSbomRequest(requestBody as SbomRequest)
    })

    Then('the validation should fail', () => {
      expect(validationResult.valid).toBe(false)
    })

    And('the error should indicate repositoryUrl must be a valid URL', () => {
      expect(validationResult.error?.message).toContain('must be a valid URL')
    })
  })

  Scenario('Validate valid repositoryUrl', ({ Given, When, Then }) => {
    Given('the SBOM request validator is initialized', () => {
      expect(validateRepositoryUrl).toBeDefined()
    })

    Given('a request body with repositoryUrl "https://github.com/test/repo"', () => {
      requestBody = { repositoryUrl: 'https://github.com/test/repo' }
    })

    When('I validate the repositoryUrl', () => {
      validationResult = validateRepositoryUrl(requestBody.repositoryUrl)
    })

    Then('the validation should succeed', () => {
      expect(validationResult.valid).toBe(true)
      expect(validationResult.error).toBeUndefined()
    })
  })

  Scenario('Validate missing SBOM', ({ Given, When, Then, And }) => {
    Given('the SBOM request validator is initialized', () => {
      expect(validateSbomRequest).toBeDefined()
    })

    Given('a request body without sbom field', () => {
      requestBody = { repositoryUrl: 'https://github.com/test/repo' }
    })

    When('I validate the request', () => {
      validationResult = validateSbomRequest(requestBody as SbomRequest)
    })

    Then('the validation should fail', () => {
      expect(validationResult.valid).toBe(false)
    })

    And('the error should indicate sbom is required', () => {
      expect(validationResult.error?.message).toContain('sbom is required')
    })
  })

  Scenario('Validate non-object SBOM', ({ Given, When, Then, And }) => {
    Given('the SBOM request validator is initialized', () => {
      expect(validateSbomRequest).toBeDefined()
    })

    Given('a request body with sbom as a string', () => {
      requestBody = { 
        repositoryUrl: 'https://github.com/test/repo',
        sbom: 'not an object' as unknown
      }
    })

    When('I validate the request', () => {
      validationResult = validateSbomRequest(requestBody as SbomRequest)
    })

    Then('the validation should fail', () => {
      expect(validationResult.valid).toBe(false)
    })

    And('the error should indicate sbom must be an object', () => {
      expect(validationResult.error?.message).toContain('must be an object')
    })
  })

  Scenario('Validate null SBOM', ({ Given, When, Then, And }) => {
    Given('the SBOM request validator is initialized', () => {
      expect(validateSbomRequest).toBeDefined()
    })

    Given('a request body with sbom as null', () => {
      requestBody = { 
        repositoryUrl: 'https://github.com/test/repo',
        sbom: null as unknown
      }
    })

    When('I validate the request', () => {
      validationResult = validateSbomRequest(requestBody as SbomRequest)
    })

    Then('the validation should fail', () => {
      expect(validationResult.valid).toBe(false)
    })

    And('the error should indicate sbom must be an object', () => {
      expect(validationResult.error?.message).toContain('sbom is required')
    })
  })

  Scenario('Validate valid SBOM structure', ({ Given, When, Then }) => {
    Given('the SBOM request validator is initialized', () => {
      expect(validateSbomStructure).toBeDefined()
    })

    Given('a request body with a valid SBOM object', () => {
      requestBody = { 
        sbom: { bomFormat: 'CycloneDX', specVersion: '1.6' }
      }
    })

    When('I validate the SBOM structure', () => {
      validationResult = validateSbomStructure(requestBody.sbom)
    })

    Then('the validation should succeed', () => {
      expect(validationResult.valid).toBe(true)
      expect(validationResult.error).toBeUndefined()
    })
  })

  Scenario('Validate complete valid request', ({ Given, When, Then, And }) => {
    Given('the SBOM request validator is initialized', () => {
      expect(validateSbomRequest).toBeDefined()
    })

    Given('a request body with valid repositoryUrl and SBOM', () => {
      requestBody = {
        repositoryUrl: 'https://github.com/test/repo',
        sbom: { bomFormat: 'CycloneDX', specVersion: '1.6' }
      }
    })

    When('I validate the complete request', () => {
      validationResult = validateSbomRequest(requestBody as SbomRequest)
    })

    Then('the validation should succeed', () => {
      expect(validationResult.valid).toBe(true)
    })

    And('no errors should be present', () => {
      expect(validationResult.error).toBeUndefined()
    })
  })
})
