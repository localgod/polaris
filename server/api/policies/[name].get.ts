import { PolicyService } from '../../services/policy.service'

/**
 * @openapi
 * /policies/{name}:
 *   get:
 *     tags:
 *       - Policies
 *     summary: Get policy details
 *     description: |
 *       Retrieves detailed information about a specific policy including:
 *       - Policy metadata and rules
 *       - Enforcing team
 *       - Teams subject to the policy
 *       - Technologies and versions governed by the policy
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Policy name
 *         example: react-version-policy
 *     responses:
 *       200:
 *         description: Policy details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Policy'
 *                         - type: object
 *                           properties:
 *                             governedVersions:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   technology:
 *                                     type: string
 *                                   version:
 *                                     type: string
 *             example:
 *               success: true
 *               data:
 *                 name: react-version-policy
 *                 description: All React versions must be 18.x or higher
 *                 ruleType: version-constraint
 *                 severity: high
 *                 status: active
 *                 enforcerTeam: frontend-platform
 *                 subjectTeams: ["frontend-team", "mobile-team"]
 *                 governedTechnologies: ["React"]
 *       400:
 *         description: Policy name is required
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Failed to fetch policy
 */
export default defineEventHandler(async (event) => {
  try {
    const rawName = getRouterParam(event, 'name')
    
    if (!rawName) {
      throw createError({
        statusCode: 400,
        message: 'Policy name is required'
      })
    }
    
    const name = decodeURIComponent(rawName)
    
    const policyService = new PolicyService()
    const policy = await policyService.findByName(name)
    
    if (!policy) {
      throw createError({
        statusCode: 404,
        message: `Policy '${name}' not found`
      })
    }
    
    return {
      success: true,
      data: policy
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policy'
    return {
      success: false,
      error: errorMessage
    }
  }
})
