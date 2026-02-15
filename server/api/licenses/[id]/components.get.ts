import { LicenseRepository } from '../../../repositories/license.repository'

/**
 * @openapi
 * /licenses/{id}/components:
 *   get:
 *     tags:
 *       - Licenses
 *     summary: List components using a license
 *     description: Returns paginated list of components that use the specified license
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID (SPDX identifier)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Components retrieved successfully
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'License ID is required' })
  }

  const query = getQuery(event)
  const limit = Math.min(Math.max(parseInt(query.limit as string, 10) || 50, 1), 200)
  const offset = Math.max(parseInt(query.offset as string, 10) || 0, 0)

  const licenseRepo = new LicenseRepository()
  const result = await licenseRepo.findComponentsByLicenseId(id, limit, offset)

  return {
    success: true,
    data: result.data,
    count: result.data.length,
    total: result.total
  }
})
