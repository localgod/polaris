import { PolicyService } from '../../services/policy.service'
import { PolicyRepository } from '../../repositories/policy.repository'

/**
 * @openapi
 * /policies/{name}:
 *   delete:
 *     tags:
 *       - Policies
 *     summary: Delete a policy
 *     description: |
 *       Deletes a policy and all its relationships.
 *       Requires superuser access or policy creator.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Policy name
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       204:
 *         description: Policy deleted successfully
 *       400:
 *         description: Policy name is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Policy not found
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Policy name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)

  // Allow superusers or the policy creator
  if (user.role !== 'superuser') {
    const policyRepo = new PolicyRepository()
    const creator = await policyRepo.getCreator(name)
    if (creator !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Only superusers or the policy creator can delete this policy'
      })
    }
  }
  
  const policyService = new PolicyService()
  await policyService.delete(name, user.id)
  
  setResponseStatus(event, 204)
  return null
})
