/**
 * @openapi
 * /compliance/violations:
 *   get:
 *     tags:
 *       - Compliance
 *     summary: Get compliance violations
 *     description: |
 *       Retrieves all compliance violations across the organization.
 *       
 *       A compliance violation occurs when:
 *       - A team uses a technology without approval (unapproved)
 *       - A team uses a technology marked for elimination (eliminated)
 *       
 *       Results include affected systems and migration targets where applicable.
 *     responses:
 *       200:
 *         description: Compliance violations retrieved successfully
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
 *                     violations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           team:
 *                             type: string
 *                           technology:
 *                             type: string
 *                           category:
 *                             type: string
 *                           systemCount:
 *                             type: integer
 *                           systems:
 *                             type: array
 *                             items:
 *                               type: string
 *                           violationType:
 *                             type: string
 *                             enum: [unapproved, eliminated]
 *                           notes:
 *                             type: string
 *                             nullable: true
 *                           migrationTarget:
 *                             type: string
 *                             nullable: true
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalViolations:
 *                           type: integer
 *                         teamsAffected:
 *                           type: integer
 *                         byTeam:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               team:
 *                                 type: string
 *                               violationCount:
 *                                 type: integer
 *                               systemsAffected:
 *                                 type: integer
 *             example:
 *               success: true
 *               data:
 *                 violations:
 *                   - team: frontend-team
 *                     technology: jQuery
 *                     category: library
 *                     systemCount: 3
 *                     systems: ["web-portal", "admin-dashboard"]
 *                     violationType: eliminated
 *                     notes: Migrate to modern framework
 *                     migrationTarget: React
 *                 summary:
 *                   totalViolations: 1
 *                   teamsAffected: 1
 *                   byTeam:
 *                     - team: frontend-team
 *                       violationCount: 1
 *                       systemsAffected: 3
 *       500:
 *         description: Failed to fetch compliance violations
 */
interface ComplianceViolation {
  team: string
  technology: string
  category: string
  systemCount: number
  systems: string[]
  violationType: string
  notes: string | null
  migrationTarget: string | null
}

export default defineEventHandler(async () => {
  const driver = useDriver()
  
  try {
    const { records } = await driver.executeQuery(`
      // Find teams using technologies without approval or with eliminate status
      MATCH (team:Team)-[u:USES]->(tech:Technology)
      OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
      WHERE a IS NULL OR a.time = 'eliminate'
      WITH team, tech, u, a,
           [(team)-[:OWNS]->(sys:System)-[:USES]->(:Component)-[:IS_VERSION_OF]->(tech) | sys.name] as systems
      RETURN 
        team.name as team,
        tech.name as technology,
        tech.category as category,
        u.systemCount as systemCount,
        systems,
        CASE 
          WHEN a IS NULL THEN 'unapproved'
          WHEN a.time = 'eliminate' THEN 'eliminated'
          ELSE 'unknown'
        END as violationType,
        a.notes as notes,
        a.migrationTarget as migrationTarget
      ORDER BY u.systemCount DESC, team.name, tech.name
    `)
    
    const violations: ComplianceViolation[] = records.map(record => ({
      team: record.get('team'),
      technology: record.get('technology'),
      category: record.get('category'),
      systemCount: record.get('systemCount')?.toNumber() || 0,
      systems: record.get('systems'),
      violationType: record.get('violationType'),
      notes: record.get('notes'),
      migrationTarget: record.get('migrationTarget')
    }))
    
    // Group by team for summary
    const byTeam = violations.reduce((acc, v) => {
      const teamKey = v.team
      if (!acc[teamKey]) {
        acc[teamKey] = []
      }
      acc[teamKey]?.push(v)
      return acc
    }, {} as Record<string, ComplianceViolation[]>)
    
    return {
      success: true,
      data: {
        violations,
        summary: {
          totalViolations: violations.length,
          teamsAffected: Object.keys(byTeam).length,
          byTeam: Object.entries(byTeam).map(([team, viols]) => ({
            team,
            violationCount: viols.length,
            systemsAffected: viols.reduce((sum, v) => sum + v.systemCount, 0)
          }))
        }
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch compliance violations: ${error}`
    })
  }
})
