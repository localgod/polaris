import { expect } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import type { SbomValidator } from '../../../server/utils/sbom-validator'
import { getSbomValidator } from '../../../server/utils/sbom-validator'

const feature = await loadFeature('./test/server/utils/sbom-validator.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let validator: SbomValidator
  let result: unknown
  let sbom: unknown
  let instance1: SbomValidator
  let instance2: SbomValidator

  Background(({ Given }) => {
    Given('the SBOM validator is initialized', async () => {
      validator = getSbomValidator()
      await validator.initialize()
      expect(validator.isInitialized()).toBe(true)
    })
  })

  Scenario('Initialize successfully', ({ When, Then }) => {
    When('I check if it is initialized', () => {
      result = validator.isInitialized()
    })

    Then('it should return true', () => {
      expect(result).toBe(true)
    })
  })

  Scenario('Not re-initialize if already initialized', ({ When, Then, And }) => {
    When('I initialize again', async () => {
      await validator.initialize()
    })

    Then('it should not throw an error', () => {
      // If we got here, no error was thrown
      expect(true).toBe(true)
    })

    And('it should still be initialized', () => {
      expect(validator.isInitialized()).toBe(true)
    })
  })

  Scenario('Detect CycloneDX format', ({ Given, When, Then }) => {
    Given('a CycloneDX SBOM document', () => {
      sbom = {
        bomFormat: 'CycloneDX',
        specVersion: '1.6',
        version: 1
      }
    })

    When('I detect the format', () => {
      result = validator.validate(sbom)
    })

    Then('it should identify as "cyclonedx"', () => {
      expect(result.format).toBe('cyclonedx')
    })
  })

  Scenario('Detect SPDX format', ({ Given, When, Then }) => {
    Given('an SPDX SBOM document', () => {
      sbom = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT'
      }
    })

    When('I detect the format', () => {
      result = validator.validate(sbom)
    })

    Then('it should identify as "spdx"', () => {
      expect(result.format).toBe('spdx')
    })
  })

  Scenario('Detect unknown format', ({ Given, When, Then }) => {
    Given('an unknown format SBOM document', () => {
      sbom = {
        someField: 'value'
      }
    })

    When('I detect the format', () => {
      result = validator.validate(sbom)
    })

    Then('it should identify as "unknown"', () => {
      expect(result.format).toBe('unknown')
    })
  })

  Scenario('Validate valid CycloneDX SBOM', ({ Given, When, Then, And }) => {
    Given('a valid CycloneDX SBOM document', () => {
      sbom = {
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
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should succeed', () => {
      expect(result.valid).toBe(true)
    })

    And('the format should be "cyclonedx"', () => {
      expect(result.format).toBe('cyclonedx')
    })
  })

  Scenario('Validate valid SPDX SBOM', ({ Given, When, Then, And }) => {
    Given('a valid SPDX SBOM document', () => {
      sbom = {
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
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should succeed', () => {
      expect(result.valid).toBe(true)
    })

    And('the format should be "spdx"', () => {
      expect(result.format).toBe('spdx')
    })
  })

  Scenario('Reject invalid CycloneDX SBOM', ({ Given, When, Then, And }) => {
    Given('an invalid CycloneDX SBOM document', () => {
      sbom = {
        bomFormat: 'CycloneDX'
        // Missing required fields
      }
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should fail', () => {
      expect(result.valid).toBe(false)
    })

    And('the format should be "cyclonedx"', () => {
      expect(result.format).toBe('cyclonedx')
    })

    And('validation errors should be present', () => {
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })
  })

  Scenario('Reject invalid SPDX SBOM', ({ Given, When, Then, And }) => {
    Given('an invalid SPDX SBOM document', () => {
      sbom = {
        spdxVersion: 'SPDX-2.3'
        // Missing required fields
      }
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should fail', () => {
      expect(result.valid).toBe(false)
    })

    And('the format should be "spdx"', () => {
      expect(result.format).toBe('spdx')
    })

    And('validation errors should be present', () => {
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })
  })

  Scenario('Reject unknown format SBOM', ({ Given, When, Then, And }) => {
    Given('an unknown format SBOM document', () => {
      sbom = { someField: 'value' }
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should fail', () => {
      expect(result.valid).toBe(false)
    })

    And('the format should be "unknown"', () => {
      expect(result.format).toBe('unknown')
    })
  })

  Scenario('Handle empty SBOM', ({ Given, When, Then, And }) => {
    Given('an empty SBOM document', () => {
      sbom = {}
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should fail', () => {
      expect(result.valid).toBe(false)
    })

    And('the format should be "unknown"', () => {
      expect(result.format).toBe('unknown')
    })
  })

  Scenario('Handle null SBOM', ({ Given, When, Then, And }) => {
    Given('a null SBOM document', () => {
      sbom = null
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should fail', () => {
      expect(result.valid).toBe(false)
    })

    And('the format should be "unknown"', () => {
      expect(result.format).toBe('unknown')
    })
  })

  Scenario('Validate CycloneDX with components', ({ Given, When, Then, And }) => {
    Given('a CycloneDX SBOM with components', () => {
      sbom = {
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
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should succeed', () => {
      expect(result.valid).toBe(true)
    })

    And('the format should be "cyclonedx"', () => {
      expect(result.format).toBe('cyclonedx')
    })
  })

  Scenario('Validate SPDX with packages', ({ Given, When, Then, And }) => {
    Given('an SPDX SBOM with packages', () => {
      sbom = {
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
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should succeed', () => {
      expect(result.valid).toBe(true)
    })

    And('the format should be "spdx"', () => {
      expect(result.format).toBe('spdx')
    })
  })

  Scenario('Reject CycloneDX with invalid component structure', ({ Given, When, Then, And }) => {
    Given('a CycloneDX SBOM with invalid component structure', () => {
      sbom = {
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
            // Missing required 'type' field
            name: 'invalid-component'
          }
        ]
      }
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should fail', () => {
      expect(result.valid).toBe(false)
    })

    And('validation errors should include component errors', () => {
      expect(result.errors).toBeDefined()
      const hasComponentError = result.errors!.some((err: { instancePath: string }) => 
        err.instancePath.includes('components')
      )
      expect(hasComponentError).toBe(true)
    })
  })

  Scenario('Reject SPDX with invalid package structure', ({ Given, When, Then, And }) => {
    Given('an SPDX SBOM with invalid package structure', () => {
      sbom = {
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
            // Missing required fields
            name: 'invalid-package'
          }
        ]
      }
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should fail', () => {
      expect(result.valid).toBe(false)
    })

    And('validation errors should include package errors', () => {
      expect(result.errors).toBeDefined()
      const hasPackageError = result.errors!.some((err: { instancePath: string }) => 
        err.instancePath.includes('packages')
      )
      expect(hasPackageError).toBe(true)
    })
  })

  Scenario('Validate CycloneDX with metadata', ({ Given, When, Then }) => {
    Given('a CycloneDX SBOM with metadata', () => {
      sbom = {
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
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should succeed', () => {
      expect(result.valid).toBe(true)
    })
  })

  Scenario('Validate SPDX with creation info', ({ Given, When, Then }) => {
    Given('an SPDX SBOM with creation info', () => {
      sbom = {
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
    })

    When('I validate the SBOM', () => {
      result = validator.validate(sbom)
    })

    Then('the validation should succeed', () => {
      expect(result.valid).toBe(true)
    })
  })

  Scenario('Return singleton instance', ({ When, Then }) => {
    When('I get the validator instance twice', () => {
      instance1 = getSbomValidator()
      instance2 = getSbomValidator()
    })

    Then('both instances should be the same', () => {
      expect(instance1).toBe(instance2)
    })
  })
})
