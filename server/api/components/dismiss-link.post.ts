import { componentService } from '../../services/singletons'

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
  await requireSuperuser(event)

  const body = await readBody(event)
  if (!body?.componentName) {
    throw createError({ statusCode: 400, message: 'componentName is required' })
  }

  await componentService.dismissLink(body.componentName)
  setResponseStatus(event, 204)
  return null
})
