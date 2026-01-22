import { PolicyRepository } from '../../repositories/policy.repository'

/**
 * @openapi
 * /licenses/denied:
 *   get:
 *     tags:
 *       - Licenses
 *     summary: Get list of denied license IDs
 *     description: |
 *       Returns the list of license IDs that are denied by the
 *       Organization License Policy.
 *     responses:
 *       200:
 *         description: Denied licenses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deniedLicenses:
 *                   type: array
 *                   items:
 *                     type: string
 */

export default defineEventHandler(async () => {
  const policyRepo = new PolicyRepository()
  
  try {
    const deniedLicenses = await policyRepo.getDeniedLicenseIds()
    
    return {
      success: true,
      deniedLicenses
    }
  } catch (error) {
    console.error('Get denied licenses error:', error)
    return {
      success: true,
      deniedLicenses: []
    }
  }
})
