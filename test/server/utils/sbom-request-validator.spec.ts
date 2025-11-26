import { describe, it, expect } from 'vitest'
import {
  validateRepositoryUrl,
  validateSbomStructure,
  validateSbomRequest,
  type SbomRequest
} from '../../../server/utils/sbom-request-validator'

describe('SBOM Request Validator', () => {
  describe('validateRepositoryUrl', () => {
    it('should fail when repositoryUrl is missing', () => {
      const result = validateRepositoryUrl(undefined)
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('repositoryUrl is required')
    })

    it('should fail when repositoryUrl is not a string', () => {
      const result = validateRepositoryUrl(123)
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('must be a string')
    })

    it('should fail when repositoryUrl has invalid URL format', () => {
      const result = validateRepositoryUrl('not-a-valid-url')
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('must be a valid URL')
    })

    it('should succeed with valid repositoryUrl', () => {
      const result = validateRepositoryUrl('https://github.com/test/repo')
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('validateSbomStructure', () => {
    it('should succeed with valid SBOM object', () => {
      const sbom = { bomFormat: 'CycloneDX', specVersion: '1.6' }
      const result = validateSbomStructure(sbom)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('validateSbomRequest', () => {
    it('should fail when repositoryUrl is missing', () => {
      const requestBody = { sbom: {} } as SbomRequest
      const result = validateSbomRequest(requestBody)
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('repositoryUrl is required')
    })

    it('should fail when repositoryUrl is not a string', () => {
      const requestBody = { repositoryUrl: 123, sbom: {} } as unknown as SbomRequest
      const result = validateSbomRequest(requestBody)
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('must be a string')
    })

    it('should fail when repositoryUrl has invalid format', () => {
      const requestBody = { repositoryUrl: 'not-a-valid-url', sbom: {} } as SbomRequest
      const result = validateSbomRequest(requestBody)
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('must be a valid URL')
    })

    it('should fail when sbom is missing', () => {
      const requestBody = { repositoryUrl: 'https://github.com/test/repo' } as SbomRequest
      const result = validateSbomRequest(requestBody)
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('sbom is required')
    })

    it('should fail when sbom is not an object', () => {
      const requestBody = { 
        repositoryUrl: 'https://github.com/test/repo',
        sbom: 'not an object' as unknown
      } as SbomRequest
      const result = validateSbomRequest(requestBody)
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('must be an object')
    })

    it('should fail when sbom is null', () => {
      const requestBody = { 
        repositoryUrl: 'https://github.com/test/repo',
        sbom: null as unknown
      } as SbomRequest
      const result = validateSbomRequest(requestBody)
      
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('sbom is required')
    })

    it('should succeed with valid request', () => {
      const requestBody = {
        repositoryUrl: 'https://github.com/test/repo',
        sbom: { bomFormat: 'CycloneDX', specVersion: '1.6' }
      } as SbomRequest
      const result = validateSbomRequest(requestBody)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
})
