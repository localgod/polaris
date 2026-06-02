import { decodeComponentKey } from '../../../utils/component-identity'
import type { PackageMetadata } from '~~/types/api'
import { componentService, eolService, packageMetadataService } from '../../services/singletons'

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

  const [eol, packageMetadata] = await Promise.all([
    eolService.getEOLStatus(component),
    packageMetadataService.getMetadata(component).catch((): PackageMetadata => ({
      status: 'unavailable',
      reason: 'fetch_failed',
      system: null,
      packageName: null,
      currentVersion: component.version,
      latestVersion: null,
      defaultVersion: null,
      publishedAt: null,
      isDeprecated: null,
      deprecatedReason: null,
      licenses: [],
      advisoryCount: null,
      advisories: [],
      recentReleases: null,
      source: {
        name: 'deps.dev',
        url: null
      }
    }))
  ])

  return {
    success: true,
    data: {
      ...component,
      eol,
      packageMetadata
    }
  }
})
