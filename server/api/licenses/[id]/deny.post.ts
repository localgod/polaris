import { PolicyRepository } from '../../../repositories/policy.repository'

/**
 * @openapi
 * /licenses/{id}/deny:
 *   post:
 *     tags:
 *       - Licenses
 *     summary: Deny a license organization-wide
 *     description: |
 *       Adds a license to the organization's denied licenses list.
 *       Creates the "Organization License Policy" if it doesn't exist.
 *       
 *       Once denied, any component using this license will appear as a violation.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID (e.g., MIT, Apache-2.0)
 *     responses:
 *       200:
 *         description: License denied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 added:
 *                   type: boolean
 *                   description: Whether the license was newly added (false if already denied)
 *                 deniedLicenses:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: License ID is required
 *       404:
 *         description: License not found
 */

export default defineEventHandler(async (event) => {
  const licenseId = getRouterParam(event, 'id')
  
  if (!licenseId) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'validation_error',
      message: 'License ID is required'
    }
  }
  
  const decodedId = decodeURIComponent(licenseId)
  const policyRepo = new PolicyRepository()
  
  try {
    const result = await policyRepo.denyLicense(decodedId)
    
    return {
      success: true,
      message: result.added 
        ? `License "${decodedId}" has been denied` 
        : `License "${decodedId}" was already denied`,
      added: result.added,
      deniedLicenses: result.policy.deniedLicenses
    }
  } catch (error) {
    console.error('License deny error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error'
    }
  }
})
