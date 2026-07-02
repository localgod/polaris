import { platformService } from '../../services/singletons'

/**
 * @openapi
 * /platforms/{name}:
 *   put:
 *     tags:
 *       - Platforms
 *     summary: Update a platform
 *     description: Updates a platform's properties and stewardship. Requires superuser role or membership in the platform's steward team.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Platform name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [application, framework, library, container, platform, operating-system, device, device-driver, firmware, file, machine-learning-model, data]
 *               domain:
 *                 type: string
 *                 enum: [foundational-runtime, framework, data-platform, integration-platform, security-identity, infrastructure, observability, developer-tooling, other]
 *               vendor:
 *                 type: string
 *               stewardTeam:
 *                 type: string
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Platform updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Platform not found
 *       422:
 *         description: Validation error
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Platform name is required'
    })
  }

  const name = decodeURIComponent(rawName)

  const platform = await platformService.findStewardTeam(name)
  if (!platform) {
    throw createError({
      statusCode: 404,
      message: `Platform '${name}' not found`
    })
  }

  // Superusers can update any platform
  if (user.role !== 'superuser') {
    const userTeamNames = user.teams?.map((t: { name: string }) => t.name) || []
    if (!platform.stewardTeam || !userTeamNames.includes(platform.stewardTeam)) {
      throw createError({
        statusCode: 403,
        message: 'Access denied. You must be a superuser or a member of the platform\'s steward team to update it.'
      })
    }
  }

  const body = await readBody(event)

  const result = await platformService.update({
    name,
    type: body.type,
    domain: body.domain,
    vendor: body.vendor,
    stewardTeam: body.stewardTeam,
    userId: user.id,
    realUserId
  })

  return { name: result }
})
