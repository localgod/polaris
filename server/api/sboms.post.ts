import type { ApiResponse } from '~~/types/api'
import { getSbomValidator } from '../utils/sbom-validator'

/**
 * @openapi
 * /api/sboms:
 *   post:
 *     tags:
 *       - SBOM
 *     summary: Validate and submit an SBOM
 *     description: |
 *       Validates a Software Bill of Materials (SBOM) in CycloneDX or SPDX format.
 *       Requires authentication via session or API token.
 *     security:
 *       - session: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repositoryUrl
 *               - sbom
 *             properties:
 *               repositoryUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to the SCM repository that produced this SBOM
 *                 example: "https://github.com/org/repo"
 *               sbom:
 *                 type: object
 *                 description: The SBOM document in CycloneDX or SPDX format
 *     responses:
 *       200:
 *         description: SBOM is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 format:
 *                   type: string
 *                   enum: [cyclonedx, spdx]
 *                 message:
 *                   type: string
 *                   example: "Valid SBOM"
 *       400:
 *         description: Bad request - invalid JSON or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "invalid_request"
 *                 message:
 *                   type: string
 *                   example: "repositoryUrl is required"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "unauthenticated"
 *                 message:
 *                   type: string
 *                   example: "Authentication required"
 *       415:
 *         description: Unsupported Media Type - Content-Type must be application/json
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "unsupported_media_type"
 *                 required:
 *                   type: string
 *                   example: "application/json"
 *       422:
 *         description: Unprocessable Entity - SBOM validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "invalid_sbom"
 *                 format:
 *                   type: string
 *                   enum: [cyclonedx, spdx, unknown]
 *                 validationErrors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       instancePath:
 *                         type: string
 *                       message:
 *                         type: string
 */

interface SbomRequest {
  repositoryUrl: string
  sbom: unknown
}

interface SbomValidResponse {
  success: true
  format: 'cyclonedx' | 'spdx'
  message: string
}

interface SbomErrorResponse {
  success: false
  error: string
  message?: string
  format?: 'cyclonedx' | 'spdx' | 'unknown'
  required?: string
  validationErrors?: Array<{
    instancePath: string
    message: string
  }>
}

type SbomResponse = SbomValidResponse | SbomErrorResponse

export default defineEventHandler(async (event): Promise<SbomResponse> => {
  // 1. Enforce Content-Type: application/json
  const contentType = getHeader(event, 'content-type')
  if (!contentType || !contentType.includes('application/json')) {
    setResponseStatus(event, 415)
    return {
      success: false,
      error: 'unsupported_media_type',
      required: 'application/json'
    }
  }

  // 2. Authenticate (token or session)
  try {
    await requireAuth(event)
  } catch (error) {
    setResponseStatus(event, 401)
    return {
      success: false,
      error: 'unauthenticated',
      message: 'Authentication required'
    }
  }

  // 3. Parse and validate request body
  let body: SbomRequest
  
  try {
    body = await readBody<SbomRequest>(event)
  } catch (error) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'invalid_request',
      message: 'Invalid JSON in request body'
    }
  }

  // Validate repositoryUrl
  if (!body.repositoryUrl) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'invalid_request',
      message: 'repositoryUrl is required'
    }
  }

  if (typeof body.repositoryUrl !== 'string') {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'invalid_request',
      message: 'repositoryUrl must be a string'
    }
  }

  // Validate repositoryUrl is a valid URL
  try {
    new URL(body.repositoryUrl)
  } catch {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'invalid_request',
      message: 'repositoryUrl must be a valid URL'
    }
  }

  // Validate sbom exists and is an object
  if (!body.sbom) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'invalid_request',
      message: 'sbom is required'
    }
  }

  if (typeof body.sbom !== 'object' || body.sbom === null) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'invalid_request',
      message: 'sbom must be an object'
    }
  }

  // 4. Validate SBOM
  try {
    const validator = getSbomValidator()
    const result = validator.validate(body.sbom)

    if (result.valid) {
      setResponseStatus(event, 200)
      return {
        success: true,
        format: result.format as 'cyclonedx' | 'spdx',
        message: 'Valid SBOM'
      }
    } else {
      setResponseStatus(event, 422)
      return {
        success: false,
        error: 'invalid_sbom',
        format: result.format,
        validationErrors: result.errors || []
      }
    }
  } catch (error) {
    // Internal error during validation
    console.error('SBOM validation error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error'
    }
  }
})
