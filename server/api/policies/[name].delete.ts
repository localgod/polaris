import { PolicyService } from '../../services/policy.service'

/**
 * @openapi
 * /policies/{name}:
 *   delete:
 *     tags:
 *       - Policies
 *     summary: Delete a policy
 *     description: |
 *       Deletes a policy and all its relationships.
 *       
 *       **TODO:** This endpoint should be restricted to superadmin users only.
 *       See GitHub issue for tracking.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Policy name
 *     responses:
 *       204:
 *         description: Policy deleted successfully
 *       400:
 *         description: Policy name is required
 *       404:
 *         description: Policy not found
 */
export default defineEventHandler(async (event) => {
  // TODO: Require superuser access for deleting policies
  // See GitHub issue #156
  // await requireSuperuser(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Policy name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  
  const policyService = new PolicyService()
  await policyService.delete(name)
  
  setResponseStatus(event, 204)
  return null
})
