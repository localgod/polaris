import { SystemService } from '../../services/system.service'

/**
 * @openapi
 * /systems/{name}:
 *   get:
 *     tags:
 *       - Systems
 *     summary: Get system by name
 *     description: Retrieves detailed information about a specific system
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     responses:
 *       200:
 *         description: System found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/System'
 *       400:
 *         description: System name is required
 *       404:
 *         description: System not found
 */
export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  
  const systemService = new SystemService()
  const system = await systemService.findByName(name)
  
  if (!system) {
    throw createError({
      statusCode: 404,
      message: `System '${name}' not found`
    })
  }
  
  return {
    success: true,
    data: system
  }
})
