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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/System'
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
    RETURN s {
      .*,
      ownerTeam: team.name,
      componentCount: count(DISTINCT c),
      repositoryCount: count(DISTINCT r)
    } as system
  `, { name })
  
  if (records.length === 0) {
    throw createError({
      statusCode: 404,
      message: `System '${name}' not found`
    })
  }
  
  return {
    success: true,
    data: records[0].get('system')
  }
})
