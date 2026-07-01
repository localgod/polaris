import { componentService } from '../../services/singletons'

/**
 * @openapi
 * /components/dismiss-link:
 *   post:
 *     tags:
 *       - Components
 *     summary: Dismiss a component from the link suggestions queue
 *     description: Marks a component as intentionally not linked to a Technology. Superuser only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purl
 *             properties:
 *               purl:
 *                 type: string
 *                 description: The package URL of the component to dismiss
 *     responses:
 *       204:
 *         description: Component dismissed from queue
 *       400:
 *         description: Missing purl
 *       403:
 *         description: Superuser access required
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const body = await readBody(event)
  if (!body?.purl) {
    throw createError({ statusCode: 400, message: 'purl is required' })
  }

  await componentService.dismissLink(body.purl)
  setResponseStatus(event, 204)
  return null
})
