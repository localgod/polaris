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
  const driver = useDriver()
  
  const { records } = await driver.executeQuery(`
    MATCH (s:System {name: $name})
    OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
    OPTIONAL MATCH (s)-[:USES]->(c:Component)
    OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
    WITH s, team.name as ownerTeam, count(DISTINCT c) as componentCount, count(DISTINCT r) as repositoryCount
    RETURN s {
      .*,
      ownerTeam: ownerTeam,
      componentCount: componentCount,
      repositoryCount: repositoryCount
    } as system
  `, { name })
  
  if (records.length === 0) {
    throw createError({
      statusCode: 404,
      message: `System '${name}' not found`
    })
  }
  
  const system = records[0].get('system')
  
  // Convert Neo4j Integer objects to regular numbers
  if (system.componentCount && typeof system.componentCount === 'object' && 'low' in system.componentCount) {
    system.componentCount = system.componentCount.toNumber ? system.componentCount.toNumber() : system.componentCount.low
  }
  if (system.repositoryCount && typeof system.repositoryCount === 'object' && 'low' in system.repositoryCount) {
    system.repositoryCount = system.repositoryCount.toNumber ? system.repositoryCount.toNumber() : system.repositoryCount.low
  }
  
  return {
    success: true,
    data: system
  }
})
