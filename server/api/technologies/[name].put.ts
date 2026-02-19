import { TechnologyService } from '../../services/technology.service'

/**
 * @openapi
 * /technologies/{name}:
 *   put:
 *     tags:
 *       - Technologies
 *     summary: Update a technology
 *     description: Updates a technology's properties and ownership. Requires superuser role or membership in the technology's owner team.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *             properties:
 *               category:
 *                 type: string
 *               vendor:
 *                 type: string
 *               ownerTeam:
 *                 type: string
 *               lastReviewed:
 *                 type: string
 *                 format: date
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Technology updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Technology not found
 *       422:
 *         description: Validation error
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Technology name is required'
    })
  }

  const name = decodeURIComponent(rawName)
  const service = new TechnologyService()

  const tech = await service.findOwnerTeam(name)
  if (!tech) {
    throw createError({
      statusCode: 404,
      message: `Technology '${name}' not found`
    })
  }

  // Superusers can update any technology
  if (user.role !== 'superuser') {
    const userTeamNames = user.teams?.map((t: { name: string }) => t.name) || []
    if (!tech.ownerTeam || !userTeamNames.includes(tech.ownerTeam)) {
      throw createError({
        statusCode: 403,
        message: 'Access denied. You must be a superuser or a member of the technology\'s owner team to update it.'
      })
    }
  }

  const body = await readBody(event)

  const result = await service.update({
    name,
    category: body.category,
    vendor: body.vendor,
    ownerTeam: body.ownerTeam,
    lastReviewed: body.lastReviewed,
    userId: user.id
  })

  return { name: result }
})
