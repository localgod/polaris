import { PolicyRepository } from '../../../repositories/policy.repository'

/**
 * @openapi
 * /licenses/{id}/allow:
 *   post:
 *     tags:
 *       - Licenses
 *     summary: Allow a previously denied license
 *     description: |
 *       Removes a license from the organization's denied licenses list.
 *       
 *       Components using this license will no longer appear as violations
 *       (unless denied by another policy).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID (e.g., MIT, Apache-2.0)
 *     responses:
 *       200:
 *         description: License allowed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 removed:
 *                   type: boolean
 *                   description: Whether the license was removed (false if wasn't denied)
 *                 deniedLicenses:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: License ID is required
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
    const result = await policyRepo.allowLicense(decodedId)
    
    return {
      success: true,
      message: result.removed 
        ? `License "${decodedId}" is now allowed` 
        : `License "${decodedId}" was not denied`,
      removed: result.removed,
      deniedLicenses: result.policy.deniedLicenses
    }
  } catch (error) {
    console.error('License allow error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error'
    }
  }
})
