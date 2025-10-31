import type { ApiResponse, Component } from '~~/types/api'

/**
 * @openapi
 * /components:
 *   get:
 *     tags:
 *       - Components
 *     summary: List all components
 *     description: Retrieves a list of all components with their metadata and system usage counts
 *     responses:
 *       200:
 *         description: Successfully retrieved components
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Component'
 *       500:
 *         description: Failed to fetch components
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<Component>> => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (c:Component)
      OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(tech:Technology)
      OPTIONAL MATCH (sys:System)-[:USES]->(c)
      RETURN c.name as name,
             c.version as version,
             c.packageManager as packageManager,
             c.license as license,
             c.sourceRepo as sourceRepo,
             c.importPath as importPath,
             c.hash as hash,
             tech.name as technologyName,
             count(DISTINCT sys) as systemCount
      ORDER BY c.packageManager, c.name
    `)
    
    const components: Component[] = records.map(record => ({
      name: record.get('name'),
      version: record.get('version'),
      packageManager: record.get('packageManager'),
      license: record.get('license'),
      sourceRepo: record.get('sourceRepo'),
      importPath: record.get('importPath'),
      hash: record.get('hash'),
      technologyName: record.get('technologyName'),
      systemCount: record.get('systemCount').toNumber()
    }))
    
    return {
      success: true,
      data: components,
      count: components.length
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch components'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
