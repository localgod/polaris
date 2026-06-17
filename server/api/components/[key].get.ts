import { decodeComponentKey } from '../../../utils/component-identity'
import type { PackageMetadata, SecurityScorecard } from '~~/types/api'
import { componentService, eolService, packageMetadataService, securityScoreService } from '../../services/singletons'

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
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Component'
 *                         - type: object
 *                           properties:
 *                             systems:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                   scope:
 *                                     type: string
 *                                     nullable: true
 *                                     enum: [required, optional, excluded, dev, test, runtime, provided]
 *                                   isDirect:
 *                                     type: boolean
 *                                     nullable: true
 *                             directDependencies:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/ComponentDirectDependency'
 *                             eol:
 *                               type: object
 *                               nullable: true
 *                             packageMetadata:
 *                               type: object
 *                               nullable: true
 *                             securityScorecard:
 *                               type: object
 *                               nullable: true
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

  const [eol, packageMetadata, securityScorecard] = await Promise.all([
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
    })),
    securityScoreService.getScore(component).catch((): SecurityScorecard => ({
      status: 'unavailable',
      reason: 'fetch_failed',
      repository: null,
      score: null,
      checks: [],
      scannedAt: null,
      source: {
        name: 'OpenSSF Scorecard',
        url: null
      }
    }))
  ])

  return {
    success: true,
    data: {
      ...component,
      eol,
      packageMetadata,
      securityScorecard
    }
  }
})
