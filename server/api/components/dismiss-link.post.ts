import { componentService } from '../../services/singletons'
import { auditFailedOperation } from '../../utils/audit'

/**
 * @openapi
 * /components/dismiss-link:
 *   post:
 *     tags:
 *       - Components
 *     summary: Dismiss a component from the link suggestions queue
 *     description: Marks a component (all versions) as intentionally not linked to a Technology. Superuser only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - componentName
 *             properties:
 *               componentName:
 *                 type: string
 *                 description: The component name to dismiss (all versions)
 *     responses:
 *       204:
 *         description: Component dismissed from queue
 *       400:
 *         description: Missing componentName
 *       403:
 *         description: Superuser access required
 */
export default defineEventHandler(async (event) => {
  const user = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const body = await readBody(event)
  if (!body?.componentName) {
    throw createError({ statusCode: 400, message: 'componentName is required' })
  }

  try {
    await componentService.dismissLink(body.componentName)
    setResponseStatus(event, 204)
    return null
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'DISMISS_LINK',
      entityType: 'Component',
      entityId: body.componentName,
      reason: error instanceof Error ? error.message : 'Failed to dismiss component link',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
