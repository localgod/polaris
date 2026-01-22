import { PolicyService } from '../../services/policy.service'

/**
 * @openapi
 * /policies/{name}:
 *   patch:
 *     tags:
 *       - Policies
 *     summary: Update a policy
 *     description: |
 *       Updates a policy's status or other properties.
 *       
 *       Status values:
 *       - `active`: Policy is enforced, violations are detected
 *       - `draft`: Policy exists but is not enforced
 *       - `archived`: Policy is disabled and hidden from active views
 *       
 *       **TODO:** This endpoint should be restricted to superadmin users only.
 *       See GitHub issue #156.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Policy name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, draft, archived]
 *                 description: New policy status
 *               reason:
 *                 type: string
 *                 description: Reason for the status change (recommended when disabling)
 *     responses:
 *       200:
 *         description: Policy updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 policy:
 *                   type: object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Policy not found
 */

interface UpdatePolicyRequest {
  status?: 'active' | 'draft' | 'archived'
  reason?: string
}

export default defineEventHandler(async (event) => {
  // TODO: Require superuser access for updating policies
  // See GitHub issue #156
  // await requireSuperuser(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'validation_error',
      message: 'Policy name is required'
    }
  }
  
  const name = decodeURIComponent(rawName)
  
  let body: UpdatePolicyRequest
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
  
  // Validate status if provided
  if (body.status) {
    const validStatuses = ['active', 'draft', 'archived']
    if (!validStatuses.includes(body.status)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'validation_error',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }
    }
  }
  
  const policyService = new PolicyService()
  
  try {
    const result = await policyService.updateStatus(name, {
      status: body.status,
      reason: body.reason
    })
    
    return {
      success: true,
      message: `Policy ${body.status === 'active' ? 'enabled' : 'disabled'} successfully`,
      policy: result.policy
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const httpError = error as { statusCode: number; message: string }
      setResponseStatus(event, httpError.statusCode)
      return {
        success: false,
        error: httpError.statusCode === 404 ? 'not_found' : 'validation_error',
        message: httpError.message
      }
    }
    
    console.error('Policy update error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error'
    }
  }
})
