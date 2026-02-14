import { SystemService } from '../../../services/system.service'

/**
 * @openapi
 * /api/systems/{name}/repositories:
 *   post:
 *     tags:
 *       - Systems
 *     summary: Register a repository for a system
 *     description: Links a repository to a system for SBOM tracking. Creates the repository if it doesn't exist.
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Repository URL
 *                 example: "https://github.com/org/repo"
 *               name:
 *                 type: string
 *                 description: Repository name (auto-extracted from URL if not provided)
 *                 example: "repo"
 *     responses:
 *       201:
 *         description: Repository registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Repository'
 *                 message:
 *                   type: string
 *                   example: "Repository registered for system my-system"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "invalid_url"
 *                 message:
 *                   type: string
 *                   example: "Invalid repository URL"
 *       404:
 *         description: System not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "system_not_found"
 *                 message:
 *                   type: string
 *                   example: "System not found: my-system"
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const systemName = getRouterParam(event, 'name')
  
  if (!systemName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }

  await validateTeamOwnership(event, 'System', systemName)
  
  const body = await readBody<{ url: string; name?: string }>(event)
  
  // Validate URL
  if (!body.url) {
    throw createError({
      statusCode: 400,
      message: 'Repository URL is required'
    })
  }
  
  try {
    new URL(body.url)
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Invalid repository URL'
    })
  }
  
  const systemService = new SystemService()
  const repository = await systemService.addRepository(systemName, body, user.id)
  
  setResponseStatus(event, 201)
  return {
    success: true,
    data: repository,
    message: `Repository registered for system ${systemName}`
  }
})
