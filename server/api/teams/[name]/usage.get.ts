/**
 * @openapi
 * /teams/{name}/usage:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Get team technology usage
 *     description: |
 *       Retrieves all technologies used by a team with usage statistics and compliance status.
 *       
 *       **Compliance Status:**
 *       - `compliant`: Technology is approved (invest/tolerate)
 *       - `unapproved`: No approval exists
 *       - `migration-needed`: Technology is marked for migration
 *       - `violation`: Technology is marked for elimination
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Team name
 *         example: frontend-team
 *     responses:
 *       200:
 *         description: Team usage retrieved successfully
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
 *                     team:
 *                       type: string
 *                     usage:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           technology:
 *                             type: string
 *                           category:
 *                             type: string
 *                           vendor:
 *                             type: string
 *                           systemCount:
 *                             type: integer
 *                           firstUsed:
 *                             type: string
 *                             format: date
 *                           lastVerified:
 *                             type: string
 *                             format: date
 *                           approvalStatus:
 *                             type: string
 *                             enum: [invest, tolerate, migrate, eliminate]
 *                           complianceStatus:
 *                             type: string
 *                             enum: [compliant, unapproved, migration-needed, violation, unknown]
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalTechnologies:
 *                           type: integer
 *                         compliant:
 *                           type: integer
 *                         unapproved:
 *                           type: integer
 *                         violations:
 *                           type: integer
 *                         migrationNeeded:
 *                           type: integer
 *             example:
 *               success: true
 *               data:
 *                 team: frontend-team
 *                 usage:
 *                   - technology: React
 *                     category: framework
 *                     vendor: Meta
 *                     systemCount: 8
 *                     firstUsed: "2023-01-15"
 *                     lastVerified: "2025-10-20"
 *                     approvalStatus: invest
 *                     complianceStatus: compliant
 *                 summary:
 *                   totalTechnologies: 15
 *                   compliant: 12
 *                   unapproved: 2
 *                   violations: 0
 *                   migrationNeeded: 1
 *       400:
 *         description: Team name is required
 *       500:
 *         description: Failed to fetch team usage
 */
export default defineEventHandler(async (event) => {
  const teamName = getRouterParam(event, 'name')
  
  if (!teamName) {
    throw createError({
      statusCode: 400,
      message: 'Team name is required'
    })
  }
  
  const driver = useDriver()
  
  try {
    const { records } = await driver.executeQuery(`
      MATCH (team:Team {name: $teamName})-[u:USES]->(tech:Technology)
      OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
      RETURN 
        tech.name as technology,
        tech.category as category,
        tech.vendor as vendor,
        u.systemCount as systemCount,
        u.firstUsed as firstUsed,
        u.lastVerified as lastVerified,
        a.time as approvalStatus,
        CASE 
          WHEN a IS NULL THEN 'unapproved'
          WHEN a.time IN ['invest', 'tolerate'] THEN 'compliant'
          WHEN a.time = 'migrate' THEN 'migration-needed'
          WHEN a.time = 'eliminate' THEN 'violation'
          ELSE 'unknown'
        END as complianceStatus
      ORDER BY u.systemCount DESC, tech.name
    `, { teamName })
    
    const usage = records.map(record => ({
      technology: record.get('technology'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      systemCount: record.get('systemCount')?.toNumber() || 0,
      firstUsed: record.get('firstUsed')?.toString() || null,
      lastVerified: record.get('lastVerified')?.toString() || null,
      approvalStatus: record.get('approvalStatus') || null,
      complianceStatus: record.get('complianceStatus')
    }))
    
    return {
      success: true,
      data: {
        team: teamName,
        usage,
        summary: {
          totalTechnologies: usage.length,
          compliant: usage.filter(u => u.complianceStatus === 'compliant').length,
          unapproved: usage.filter(u => u.complianceStatus === 'unapproved').length,
          violations: usage.filter(u => u.complianceStatus === 'violation').length,
          migrationNeeded: usage.filter(u => u.complianceStatus === 'migration-needed').length
        }
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch team usage: ${error}`
    })
  }
})
