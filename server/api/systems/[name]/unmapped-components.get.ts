import type { UnmappedComponent } from '~~/types/api'

/**
 * @openapi
 * /systems/{name}/unmapped-components:
 *   get:
 *     tags:
 *       - Systems
 *     summary: Get unmapped components for a system
 *     description: |
 *       Retrieves all components used by a system that are not mapped to a known technology.
 *       
 *       These components need manual review to determine if they should be:
 *       - Mapped to an existing technology
 *       - Added as a new technology
 *       - Marked as internal/proprietary
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *         example: web-portal
 *     responses:
 *       200:
 *         description: Unmapped components retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     system:
 *                       type: string
 *                     components:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UnmappedComponent'
 *                     count:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 system: web-portal
 *                 components:
 *                   - name: "@company/internal-ui"
 *                     version: "2.1.0"
 *                     packageManager: npm
 *                     license: proprietary
 *                 count: 1
 *       400:
 *         description: System name is required
 *       404:
 *         description: System not found
 *       500:
 *         description: Failed to fetch unmapped components
 */
export default defineEventHandler(async (event) => {
  try {
    const rawName = getRouterParam(event, 'name')
    
    if (!rawName) {
      throw createError({
        statusCode: 400,
        message: 'System name is required'
      })
    }
    
    const systemName = decodeURIComponent(rawName)
    const driver = useDriver()

    // First check if system exists
    const { records: systemCheck } = await driver.executeQuery(`
      MATCH (s:System {name: $systemName})
      RETURN s.name as name
    `, { systemName })

    if (systemCheck.length === 0) {
      throw createError({
        statusCode: 404,
        message: `System '${systemName}' not found`
      })
    }

    // Get unmapped components for this system
    const { records } = await driver.executeQuery(`
      MATCH (sys:System {name: $systemName})-[:USES]->(c:Component)
      WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
      RETURN c.name as name,
             c.version as version,
             c.packageManager as packageManager,
             c.license as license,
             c.sourceRepo as sourceRepo,
             c.importPath as importPath,
             c.hash as hash
      ORDER BY c.name
    `, { systemName })

    const components: UnmappedComponent[] = records.map(record => ({
      name: record.get('name'),
      version: record.get('version'),
      packageManager: record.get('packageManager'),
      license: record.get('license'),
      sourceRepo: record.get('sourceRepo'),
      importPath: record.get('importPath'),
      hash: record.get('hash')
    }))

    return {
      success: true,
      data: {
        system: systemName,
        components,
        count: components.length
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch unmapped components'
    return {
      success: false,
      error: errorMessage,
      data: {
        system: '',
        components: [],
        count: 0
      }
    }
  }
})
