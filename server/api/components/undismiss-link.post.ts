import { componentService } from '../../services/singletons'
import { auditFailedOperation } from '../../utils/audit'

/**
 * @openapi
 * /components/undismiss-link:
 *   post:
 *     tags:
 *       - Components
 *     summary: Restore a dismissed component to the link suggestions queue
 *     description: Clears the dismissal (all versions), so the component can reappear in /components/link-suggestions. Superuser only.
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
 *                 description: The component name to restore (all versions)
 *               componentGroup:
 *                 type: string
 *                 description: Npm scope / Maven groupId / etc., to disambiguate components sharing a bare name
 *               componentPackageManager:
 *                 type: string
 *                 description: Package manager, to disambiguate components sharing a bare name across ecosystems
 *     responses:
 *       204:
 *         description: Component restored to queue
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
    await componentService.undismissLink({
      name: body.componentName,
      group: body.componentGroup ?? null,
      packageManager: body.componentPackageManager ?? null
    })
    setResponseStatus(event, 204)
    return null
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'UNDISMISS_LINK',
      entityType: 'Component',
      entityId: body.componentName,
      reason: error instanceof Error ? error.message : 'Failed to restore component link',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
