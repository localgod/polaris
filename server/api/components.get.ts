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
      OPTIONAL MATCH (c)-[:HAS_HASH]->(h:Hash)
      OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
      OPTIONAL MATCH (c)-[:HAS_REFERENCE]->(ref:ExternalReference)
      WITH c, tech,
           count(DISTINCT sys) as systemCount,
           collect(DISTINCT {algorithm: h.algorithm, value: h.value}) as hashes,
           collect(DISTINCT {id: l.id, name: l.name, url: l.url, text: l.text}) as licenses,
           collect(DISTINCT {type: ref.type, url: ref.url}) as externalReferences
      RETURN c.name as name,
             c.version as version,
             c.packageManager as packageManager,
             c.purl as purl,
             c.cpe as cpe,
             c.bomRef as bomRef,
             c.type as type,
             c.group as group,
             c.scope as scope,
             hashes,
             licenses,
             c.copyright as copyright,
             c.supplier as supplier,
             c.author as author,
             c.publisher as publisher,
             c.description as description,
             c.homepage as homepage,
             externalReferences,
             c.releaseDate as releaseDate,
             c.publishedDate as publishedDate,
             c.modifiedDate as modifiedDate,
             tech.name as technologyName,
             systemCount
      ORDER BY c.packageManager, c.name
    `)
    
    const components: Component[] = records.map(record => ({
      name: record.get('name'),
      version: record.get('version'),
      packageManager: record.get('packageManager'),
      purl: record.get('purl'),
      cpe: record.get('cpe'),
      bomRef: record.get('bomRef'),
      type: record.get('type'),
      group: record.get('group'),
      scope: record.get('scope'),
      hashes: record.get('hashes').filter((h: any) => h.algorithm),
      licenses: record.get('licenses').filter((l: any) => l.id || l.name),
      copyright: record.get('copyright'),
      supplier: record.get('supplier'),
      author: record.get('author'),
      publisher: record.get('publisher'),
      description: record.get('description'),
      homepage: record.get('homepage'),
      externalReferences: record.get('externalReferences').filter((r: any) => r.type),
      releaseDate: record.get('releaseDate')?.toString(),
      publishedDate: record.get('publishedDate')?.toString(),
      modifiedDate: record.get('modifiedDate')?.toString(),
      technologyName: record.get('technologyName'),
      systemCount: record.get('systemCount')
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
