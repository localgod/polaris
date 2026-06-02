import type { EOLStatus } from '~~/types/api'
import { eolService } from '../../services/singletons'

type EOLResponse =
  | { success: true; data: EOLStatus }
  | { success: false; error: string; data: [] }

/**
 * @openapi
 * /components/eol:
 *   get:
 *     tags:
 *       - Components
 *     summary: Get component end-of-life visibility
 *     description: Retrieves read-only lifecycle visibility from endoflife.date for a component version.
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: packageManager
 *         schema:
 *           type: string
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *       - in: query
 *         name: purl
 *         schema:
 *           type: string
 *       - in: query
 *         name: technologyName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lifecycle visibility resolved
 *       400:
 *         description: Missing component name or version
 */
export default defineEventHandler(async (event): Promise<EOLResponse> => {
  const query = getQuery(event)
  const name = query.name as string | undefined
  const version = query.version as string | undefined

  if (!name || !version) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'name and version are required',
      data: []
    }
  }

  const status = await eolService.getEOLStatus({
    name,
    version,
    packageManager: query.packageManager as string | undefined,
    group: query.group as string | undefined,
    purl: query.purl as string | undefined,
    technologyName: query.technologyName as string | undefined
  })

  return {
    success: true,
    data: status
  }
})
