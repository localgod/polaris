import { platformService } from '../../services/singletons'

/**
 * @openapi
 * /platforms/{name}:
 *   get:
 *     tags:
 *       - Platforms
 *     summary: Get platform details
 *     description: Retrieves detailed information about a specific platform, including its steward team and TIME approvals.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Platform name (e.g., "PostgreSQL", "Kubernetes")
 *     responses:
 *       200:
 *         description: Platform details retrieved successfully
 *       400:
 *         description: Platform name is required
 *       404:
 *         description: Platform not found
 *       500:
 *         description: Failed to fetch platform
 */
export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')

    if (!name) {
      throw createError({
        statusCode: 400,
        message: 'Platform name is required'
      })
    }

    const platform = await platformService.findByName(decodeURIComponent(name))

    if (!platform) {
      throw createError({
        statusCode: 404,
        message: `Platform '${name}' not found`
      })
    }

    return {
      success: true,
      data: platform
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch platform'
    throw createError({
      statusCode: 500,
      message: errorMessage
    })
  }
})
