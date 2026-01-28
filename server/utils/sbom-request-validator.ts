/**
 * SBOM Request Validation
 * 
 * Pure validation functions for SBOM API request parameters.
 * These functions are framework-agnostic and can be unit tested
 * without HTTP context.
 */

export interface RequestValidationResult {
  valid: boolean
  error?: {
    code: string
    message: string
  }
}

/**
 * Validate repositoryUrl parameter
 * 
 * Business rules:
 * - Must be present (not null/undefined)
 * - Must be a string
 * - Must be a valid URL format
 * 
 * @param url - The repositoryUrl value to validate
 * @returns Validation result with error details if invalid
 */
export function validateRepositoryUrl(url: unknown): RequestValidationResult {
  if (url === undefined || url === null) {
    return {
      valid: false,
      error: {
        code: 'invalid_request',
        message: 'repositoryUrl is required'
      }
    }
  }

  if (typeof url !== 'string') {
    return {
      valid: false,
      error: {
        code: 'invalid_request',
        message: 'repositoryUrl must be a string'
      }
    }
  }

  try {
    new URL(url)
    return { valid: true }
  } catch {
    return {
      valid: false,
      error: {
        code: 'invalid_request',
        message: 'repositoryUrl must be a valid URL'
      }
    }
  }
}

/**
 * Validate SBOM structure (basic type checking)
 * 
 * Business rules:
 * - Must be present (not null/undefined)
 * - Must be an object (not a primitive or array)
 * 
 * Note: This only validates the structure, not the schema.
 * Schema validation is handled by SbomValidator.
 * 
 * @param sbom - The SBOM value to validate
 * @returns Validation result with error details if invalid
 */
export function validateSbomStructure(sbom: unknown): RequestValidationResult {
  if (sbom === undefined || sbom === null) {
    return {
      valid: false,
      error: {
        code: 'invalid_request',
        message: 'sbom is required'
      }
    }
  }

  if (typeof sbom !== 'object' || sbom === null) {
    return {
      valid: false,
      error: {
        code: 'invalid_request',
        message: 'sbom must be an object'
      }
    }
  }

  return { valid: true }
}

/**
 * SBOM request structure
 */
export interface SbomRequest {
  repositoryUrl: unknown
  sbom: unknown
}

/**
 * Validate complete SBOM request
 * 
 * Validates both repositoryUrl and SBOM structure.
 * Returns the first validation error encountered.
 * 
 * @param request - The request body to validate
 * @returns Validation result with error details if invalid
 */
export function validateSbomRequest(request: SbomRequest): RequestValidationResult {
  // Validate repositoryUrl first
  const urlResult = validateRepositoryUrl(request.repositoryUrl)
  if (!urlResult.valid) {
    return urlResult
  }

  // Validate SBOM structure
  const sbomResult = validateSbomStructure(request.sbom)
  if (!sbomResult.valid) {
    return sbomResult
  }

  return { valid: true }
}
