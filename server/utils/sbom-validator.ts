import Ajv from 'ajv'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { ErrorObject } from 'ajv'

/**
 * SBOM format types
 */
export type SbomFormat = 'cyclonedx' | 'spdx' | 'unknown'

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  format: SbomFormat
  errors?: ValidationError[]
}

/**
 * Validation error details
 */
export interface ValidationError {
  instancePath: string
  message: string
  keyword?: string
  params?: Record<string, unknown>
}

/**
 * SBOM Validator using Ajv
 * 
 * Validates CycloneDX and SPDX SBOM formats against their JSON schemas.
 * Validators are compiled once at startup for performance.
 */
export class SbomValidator {
  private ajv: Ajv
  private cyclonedxValidator: ReturnType<Ajv['compile']> | null = null
  private spdxValidator: ReturnType<Ajv['compile']> | null = null
  private initialized = false

  constructor() {
    // Initialize Ajv with strict schema validation
    this.ajv = new Ajv({
      allErrors: true, // Collect all errors, not just the first
      verbose: true, // Include validated data in errors
      strict: false, // Allow schema features that aren't strict JSON Schema
      logger: false // Suppress format warnings in tests
    })
  }

  /**
   * Initialize validators by loading and compiling schemas
   * 
   * Should be called once at application startup.
   * Throws if schemas cannot be loaded or compiled.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Load schema files
      const schemaDir = join(process.cwd(), 'server', 'schemas')
      
      const cyclonedxSchemaPath = join(schemaDir, 'cyclonedx-1.6.schema.json')
      const spdxSchemaPath = join(schemaDir, 'spdx-2.3.schema.json')
      const spdxRefSchemaPath = join(schemaDir, 'spdx.schema.json') // Referenced by CycloneDX
      const jsfSchemaPath = join(schemaDir, 'jsf-0.82.schema.json') // Referenced by CycloneDX
      
      const cyclonedxSchema = JSON.parse(readFileSync(cyclonedxSchemaPath, 'utf-8'))
      const spdxSchema = JSON.parse(readFileSync(spdxSchemaPath, 'utf-8'))
      const spdxRefSchema = JSON.parse(readFileSync(spdxRefSchemaPath, 'utf-8'))
      const jsfSchema = JSON.parse(readFileSync(jsfSchemaPath, 'utf-8'))
      
      // Add referenced schemas to Ajv
      this.ajv.addSchema(spdxRefSchema, 'http://cyclonedx.org/schema/spdx.schema.json')
      this.ajv.addSchema(jsfSchema, 'http://cyclonedx.org/schema/jsf-0.82.schema.json')
      
      // Compile validators
      this.cyclonedxValidator = this.ajv.compile(cyclonedxSchema)
      this.spdxValidator = this.ajv.compile(spdxSchema)
      
      this.initialized = true
      
      console.log('✅ SBOM validators initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize SBOM validators:', error)
      throw new Error(`Failed to initialize SBOM validators: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate an SBOM document
   * 
   * @param sbom - SBOM document (JSON object)
   * @returns Validation result with format and any errors
   */
  validate(sbom: unknown): ValidationResult {
    if (!this.initialized) {
      throw new Error('SBOM validator not initialized. Call initialize() first.')
    }

    // Detect format
    const format = this.detectFormat(sbom)

    if (format === 'unknown') {
      return {
        valid: false,
        format: 'unknown',
        errors: [{
          instancePath: '',
          message: 'Unable to detect SBOM format. Expected CycloneDX or SPDX.'
        }]
      }
    }

    // Validate against appropriate schema
    const validator = format === 'cyclonedx' ? this.cyclonedxValidator : this.spdxValidator

    if (!validator) {
      throw new Error(`Validator for format ${format} not initialized`)
    }

    const valid = validator(sbom)

    if (valid) {
      return {
        valid: true,
        format
      }
    }

    // Map Ajv errors to our format
    const errors = this.mapErrors(validator.errors || [])

    return {
      valid: false,
      format,
      errors
    }
  }

  /**
   * Detect SBOM format from document structure
   * 
   * @param sbom - SBOM document
   * @returns Detected format or 'unknown'
   */
  private detectFormat(sbom: unknown): SbomFormat {
    if (typeof sbom !== 'object' || sbom === null) {
      return 'unknown'
    }

    const obj = sbom as Record<string, unknown>

    // CycloneDX detection: has 'bomFormat' or 'specVersion' with CycloneDX-specific values
    if (
      obj.bomFormat === 'CycloneDX' ||
      (typeof obj.specVersion === 'string' && obj.specVersion.match(/^1\.\d+$/))
    ) {
      return 'cyclonedx'
    }

    // SPDX detection: has 'spdxVersion' or 'SPDXID'
    if (
      (typeof obj.spdxVersion === 'string' && obj.spdxVersion.startsWith('SPDX-')) ||
      (typeof obj.SPDXID === 'string')
    ) {
      return 'spdx'
    }

    return 'unknown'
  }

  /**
   * Map Ajv errors to our ValidationError format
   * 
   * @param errors - Ajv error objects
   * @returns Array of ValidationError
   */
  private mapErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map(err => ({
      instancePath: err.instancePath || '',
      message: err.message || 'Validation error',
      keyword: err.keyword,
      params: err.params
    }))
  }

  /**
   * Check if validator is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// Singleton instance
let validatorInstance: SbomValidator | null = null

/**
 * Get the singleton SBOM validator instance
 * 
 * @returns SBOM validator instance
 */
export function getSbomValidator(): SbomValidator {
  if (!validatorInstance) {
    validatorInstance = new SbomValidator()
  }
  return validatorInstance
}

/**
 * Initialize the SBOM validator
 * 
 * Should be called once at application startup (e.g., in a Nitro plugin).
 */
export async function initializeSbomValidator(): Promise<void> {
  const validator = getSbomValidator()
  await validator.initialize()
}
