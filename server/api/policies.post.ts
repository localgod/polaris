import { PolicyService } from '../services/policy.service'
import type { CreatePolicyInput } from '../repositories/policy.repository'

/**
 * @openapi
 * /policies:
 *   post:
 *     tags:
 *       - Policies
 *     summary: Create a new policy
 *     description: |
 *       Creates a new policy for governance enforcement.
 *       
 *       For license-compliance policies, you must specify:
 *       - `licenseMode`: Either 'allowlist' or 'denylist'
 *       - `allowedLicenses` or `deniedLicenses`: Array of license IDs
 *       
 *       Organization-scope policies automatically create SUBJECT_TO relationships
 *       with all teams.
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
 *               - name
 *               - ruleType
 *               - severity
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique policy name
 *                 example: "Prohibit MIT License"
 *               description:
 *                 type: string
 *                 description: Policy description
 *                 example: "MIT license is not allowed due to legal requirements"
 *               ruleType:
 *                 type: string
 *                 enum: [approval, compliance, security, license-compliance]
 *                 description: Type of policy rule
 *                 example: "license-compliance"
 *               severity:
 *                 type: string
 *                 enum: [critical, error, warning, info]
 *                 description: Severity level for violations
 *                 example: "error"
 *               scope:
 *                 type: string
 *                 enum: [organization, team]
 *                 default: organization
 *                 description: Policy scope
 *               status:
 *                 type: string
 *                 enum: [active, draft, archived]
 *                 default: active
 *                 description: Policy status
 *               enforcedBy:
 *                 type: string
 *                 description: Team responsible for enforcement
 *                 example: "Security"
 *               licenseMode:
 *                 type: string
 *                 enum: [allowlist, denylist]
 *                 description: Required for license-compliance policies
 *                 example: "denylist"
 *               allowedLicenses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: License IDs to allow (for allowlist mode)
 *                 example: ["Apache-2.0", "BSD-3-Clause"]
 *               deniedLicenses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: License IDs to deny (for denylist mode)
 *                 example: ["MIT", "MIT/X11"]
 *     responses:
 *       201:
 *         description: Policy created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Policy created successfully"
 *                 policy:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     ruleType:
 *                       type: string
 *                     severity:
 *                       type: string
 *                     status:
 *                       type: string
 *                     licenseMode:
 *                       type: string
 *                 relationshipsCreated:
 *                   type: integer
 *                   example: 7
 *       400:
 *         description: Bad request - validation failed
 *       401:
 *         description: Unauthorized - authentication required
 *       409:
 *         description: Conflict - policy already exists
 */

interface CreatePolicyRequest {
  name: string
  description?: string
  ruleType: string
  severity: string
  scope?: string
  subjectTeam?: string
  versionRange?: string
  governsTechnology?: string
  status?: string
  enforcedBy?: string
  licenseMode?: 'allowlist' | 'denylist'
  allowedLicenses?: string[]
  deniedLicenses?: string[]
}

export default defineEventHandler(async (event) => {
  // Authenticate
  let user
  try {
    user = await requireAuth(event)
  } catch {
    setResponseStatus(event, 401)
    return {
      success: false,
      error: 'unauthenticated',
      message: 'Authentication required'
    }
  }

  // Parse request body
  let body: CreatePolicyRequest
  try {
    body = await readBody(event)
  } catch {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'invalid_request',
      message: 'Invalid JSON in request body'
    }
  }

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'validation_error',
      message: 'Policy name is required'
    }
  }

  if (!body.ruleType || typeof body.ruleType !== 'string') {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'validation_error',
      message: 'Policy ruleType is required'
    }
  }

  if (!body.severity || typeof body.severity !== 'string') {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'validation_error',
      message: 'Policy severity is required'
    }
  }

  // Create policy
  const policyService = new PolicyService()
  
  try {
    const input: CreatePolicyInput = {
      name: body.name.trim(),
      description: body.description,
      ruleType: body.ruleType,
      severity: body.severity,
      scope: body.scope,
      subjectTeam: body.subjectTeam,
      versionRange: body.versionRange,
      governsTechnology: body.governsTechnology,
      status: body.status,
      enforcedBy: body.enforcedBy,
      licenseMode: body.licenseMode,
      allowedLicenses: body.allowedLicenses,
      deniedLicenses: body.deniedLicenses,
      userId: user.id
    }

    const result = await policyService.create(input)

    setResponseStatus(event, 201)
    return {
      success: true,
      message: 'Policy created successfully',
      policy: {
        name: result.policy.name,
        description: result.policy.description,
        ruleType: result.policy.ruleType,
        severity: result.policy.severity,
        scope: result.policy.scope,
        status: result.policy.status,
        licenseMode: result.policy.licenseMode,
        enforcedBy: result.policy.enforcedBy
      },
      relationshipsCreated: result.relationshipsCreated
    }
  } catch (error) {
    // Handle known errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const httpError = error as { statusCode: number; message: string }
      setResponseStatus(event, httpError.statusCode)
      return {
        success: false,
        error: httpError.statusCode === 409 ? 'conflict' : 'validation_error',
        message: httpError.message
      }
    }

    // Unknown error
    console.error('Policy creation error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error'
    }
  }
})
