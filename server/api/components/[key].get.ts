import { decodeComponentKey } from '../../../utils/component-identity'
import { componentService, eolService } from '../../services/singletons'

/**
 * @openapi
 * /components/{key}:
 *   get:
 *     tags:
 *       - Components
 *     summary: Get component details
 *     description: Retrieves a single component by its encoded component identity key.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Encoded component identity from the components list.
 *     responses:
 *       200:
 *         description: Component details retrieved successfully
 *       400:
 *         description: Component key is missing or invalid
 *       404:
 *         description: Component not found
 */
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'Component key is required'
    })
  }

  const identity = decodeComponentKey(key)
  if (!identity) {
    throw createError({
      statusCode: 400,
      message: 'Component key is invalid'
    })
  }

  const component = await componentService.findByIdentity(identity)
  if (!component) {
    throw createError({
      statusCode: 404,
      message: 'Component not found'
    })
  }

  const eol = await eolService.getEOLStatus(component)

  return {
    success: true,
    data: {
      ...component,
      eol
    }
  }
})
