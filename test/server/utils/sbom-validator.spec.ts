import { describe, it, expect, beforeAll } from 'vitest'
import type { SbomValidator } from '../../../server/utils/sbom-validator'
import { getSbomValidator } from '../../../server/utils/sbom-validator'

describe('SBOM Validator', () => {
  let validator: SbomValidator

  beforeAll(async () => {
    validator = getSbomValidator()
    await validator.initialize()
  })

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(validator.isInitialized()).toBe(true)
    })

    it('should not re-initialize if already initialized', async () => {
      await validator.initialize()
      expect(validator.isInitialized()).toBe(true)
    })

    it('should return singleton instance', () => {
      const instance1 = getSbomValidator()
      const instance2 = getSbomValidator()
      expect(instance1).toBe(instance2)
    })
  })

  describe('format detection', () => {
    it('should detect CycloneDX format', () => {
      const sbom = {
        bomFormat: 'CycloneDX',
        specVersion: '1.6',
        version: 1
      }
      const result = validator.validate(sbom)
      expect(result.format).toBe('cyclonedx')
    })

    it('should detect SPDX format', () => {
      const sbom = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT'
      }
      const result = validator.validate(sbom)
      expect(result.format).toBe('spdx')
    })

    it('should detect unknown format', () => {
      const sbom = { someField: 'value' }
      const result = validator.validate(sbom)
      expect(result.format).toBe('unknown')
    })
  })

  describe('CycloneDX validation', () => {
    it('should validate valid CycloneDX SBOM', () => {
      const sbom = {
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
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(true)
      expect(result.format).toBe('cyclonedx')
    })

    it('should validate CycloneDX with components', () => {
      const sbom = {
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
        components: [
          {
            type: 'library',
            name: 'lodash',
            version: '4.17.21',
            purl: 'pkg:npm/lodash@4.17.21'
          }
        ]
      }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(true)
      expect(result.format).toBe('cyclonedx')
    })

    it('should validate CycloneDX with metadata', () => {
      const sbom = {
        bomFormat: 'CycloneDX',
        specVersion: '1.6',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          component: {
            type: 'application',
            name: 'test-app',
            version: '1.0.0',
            description: 'Test application'
          },
          authors: [
            { name: 'Test Author' }
          ]
        },
        components: []
      }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(true)
    })

    it('should reject invalid CycloneDX SBOM', () => {
      const sbom = {
        bomFormat: 'CycloneDX'
      }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(false)
      expect(result.format).toBe('cyclonedx')
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should reject CycloneDX with invalid component structure', () => {
      const sbom = {
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
        components: [
          {
            name: 'invalid-component'
          }
        ]
      }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      const hasComponentError = result.errors!.some((err: { instancePath: string }) => 
        err.instancePath.includes('components')
      )
      expect(hasComponentError).toBe(true)
    })
  })

  describe('SPDX validation', () => {
    it('should validate valid SPDX SBOM', () => {
      const sbom = {
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
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(true)
      expect(result.format).toBe('spdx')
    })

    it('should validate SPDX with packages', () => {
      const sbom = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'test-sbom',
        documentNamespace: 'https://example.com/test-sbom-1234',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: test']
        },
        packages: [
          {
            SPDXID: 'SPDXRef-Package',
            name: 'lodash',
            versionInfo: '4.17.21',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false
          }
        ]
      }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(true)
      expect(result.format).toBe('spdx')
    })

    it('should validate SPDX with creation info', () => {
      const sbom = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'test-sbom',
        documentNamespace: 'https://example.com/test-sbom-1234',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: test', 'Person: Test Author'],
          licenseListVersion: '3.21'
        },
        packages: []
      }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(true)
    })

    it('should reject invalid SPDX SBOM', () => {
      const sbom = {
        spdxVersion: 'SPDX-2.3'
      }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(false)
      expect(result.format).toBe('spdx')
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should reject SPDX with invalid package structure', () => {
      const sbom = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'test-sbom',
        documentNamespace: 'https://example.com/test-sbom-1234',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: test']
        },
        packages: [
          {
            name: 'invalid-package'
          }
        ]
      }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      const hasPackageError = result.errors!.some((err: { instancePath: string }) => 
        err.instancePath.includes('packages')
      )
      expect(hasPackageError).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should reject empty SBOM', () => {
      const sbom = {}
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(false)
      expect(result.format).toBe('unknown')
    })

    it('should reject null SBOM', () => {
      const sbom = null
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(false)
      expect(result.format).toBe('unknown')
    })

    it('should reject unknown format SBOM', () => {
      const sbom = { someField: 'value' }
      const result = validator.validate(sbom)
      
      expect(result.valid).toBe(false)
      expect(result.format).toBe('unknown')
    })
  })
})
