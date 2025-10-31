import type { ApiResponse, Team } from '~~/types/api'

/**
 * @openapi
 * /teams:
 *   get:
 *     tags:
 *       - Teams
 *     summary: List all teams
 *     description: Retrieves a list of all teams with their technology and system counts
 *     responses:
 *       200:
 *         description: Successfully retrieved teams
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
 *                         $ref: '#/components/schemas/Team'
 *       500:
 *         description: Failed to fetch teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<Team>> => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (t:Team)
      OPTIONAL MATCH (t)-[:STEWARDED_BY]->(tech:Technology)
      OPTIONAL MATCH (t)-[:OWNS]->(sys:System)
      RETURN t.name as name,
             t.email as email,
             t.responsibilityArea as responsibilityArea,
             count(DISTINCT tech) as technologyCount,
             count(DISTINCT sys) as systemCount
      ORDER BY t.name
    `)
    
    const teams: Team[] = records.map(record => ({
      name: record.get('name'),
      email: record.get('email'),
      responsibilityArea: record.get('responsibilityArea'),
      technologyCount: record.get('technologyCount').toNumber(),
      systemCount: record.get('systemCount').toNumber()
    }))
    
    return {
      success: true,
      data: teams,
      count: teams.length
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch teams'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
