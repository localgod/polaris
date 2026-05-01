import { technologyService } from '../../../services/singletons'

/**
 * @openapi
 * /technologies/{name}/components:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Link a component to a technology
 *     description: Creates an IS_VERSION_OF relationship between a component and a technology.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - componentName
 *               - componentVersion
 *             properties:
 *               componentName:
 *                 type: string
 *               componentVersion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Component linked
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Technology not found
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Technology name is required' })
  }
  const technologyName = decodeURIComponent(rawName)

  const body = await readBody(event)
  if (!body?.componentName || !body?.componentVersion) {
    throw createError({ statusCode: 400, message: 'componentName and componentVersion are required' })
  }

  const result = await technologyService.linkComponent({
    technologyName,
    componentName: body.componentName,
    componentVersion: body.componentVersion,
    userId: user.id,
    realUserId
  })

  return { success: true, data: result }
})
