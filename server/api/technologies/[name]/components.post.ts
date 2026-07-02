import { technologyService } from '../../../services/singletons'

/**
 * @openapi
 * /technologies/{name}/components:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Link a component to a technology
 *     description: >
 *       Creates an IS_VERSION_OF relationship between a component and a technology.
 *       Accepts either `purl` (PURL-based, preferred for SBOM-sourced components) or
 *       `componentName` + `componentVersion` (legacy, name+version match).
 *       When `purl` is provided the call requires superuser access and also refreshes
 *       Team→Technology USES edges for all affected systems.
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
 *             oneOf:
 *               - required: [purl]
 *                 properties:
 *                   purl:
 *                     type: string
 *               - required: [componentName, componentVersion]
 *                 properties:
 *                   componentName:
 *                     type: string
 *                   componentVersion:
 *                     type: string
 *     responses:
 *       200:
 *         description: Component linked
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Superuser access required (purl path only)
 *       404:
 *         description: Technology not found
 */
export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, message: 'Technology name is required' })
  }
  const technologyName = decodeURIComponent(rawName)

  const body = await readBody(event)

  // Handle PURL-based linking (single component) or component name (all versions)
  if (body?.purl) {
    const user = await requireSuperuser(event)
    const realUserId = await getImpersonatorId(event)

    // Check if purl looks like a PURL (starts with pkg:) or is a component name
    if (body.purl.startsWith('pkg:')) {
      // Full PURL - link specific component
      const result = await technologyService.linkComponentByPurl({
        technologyName,
        purl: body.purl,
        userId: user.id,
        realUserId
      })
      return { success: true, data: result }
    } else {
      // Component name - link all versions of this component
      const result = await technologyService.linkComponentByName({
        technologyName,
        componentName: body.purl,
        userId: user.id,
        realUserId
      })
      return { success: true, data: result }
    }
  }

  const user = await requireAuth(event)
  const realUserId = await getImpersonatorId(event)

  if (!body?.componentName || !body?.componentVersion) {
    throw createError({ statusCode: 400, message: 'componentName and componentVersion are required (or provide purl)' })
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

