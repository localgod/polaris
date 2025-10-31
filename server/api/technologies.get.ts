import type { ApiResponse, Technology } from '~~/types/api'

/**
 * @openapi
 * /technologies:
 *   get:
 *     tags:
 *       - Technologies
 *     summary: List all technologies
 *     description: Retrieves a list of all technologies with their versions and approvals
 *     responses:
 *       200:
 *         description: Successfully retrieved technologies
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
 *                         $ref: '#/components/schemas/Technology'
 *       500:
 *         description: Failed to fetch technologies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (): Promise<ApiResponse<Technology>> => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (t:Technology)
      OPTIONAL MATCH (team:Team)-[:OWNS]->(t)
      OPTIONAL MATCH (t)-[:HAS_VERSION]->(v:Version)
      OPTIONAL MATCH (approvalTeam:Team)-[approval:APPROVES]->(t)
      RETURN t.name as name,
             t.category as category,
             t.vendor as vendor,
             t.approvedVersionRange as approvedVersionRange,
             t.ownerTeam as ownerTeam,
             t.riskLevel as riskLevel,
             t.lastReviewed as lastReviewed,
             team.name as ownerTeamName,
             collect(DISTINCT v.version) as versions,
             collect(DISTINCT {
               team: approvalTeam.name,
               time: approval.time,
               approvedAt: approval.approvedAt,
               deprecatedAt: approval.deprecatedAt,
               eolDate: approval.eolDate,
               migrationTarget: approval.migrationTarget,
               notes: approval.notes,
               approvedBy: approval.approvedBy,
               versionConstraint: approval.versionConstraint
             }) as approvals
      ORDER BY t.category, t.name
    `)
    
    const technologies: Technology[] = records.map(record => ({
      name: record.get('name'),
      category: record.get('category'),
      vendor: record.get('vendor'),
      approvedVersionRange: record.get('approvedVersionRange'),
      ownerTeam: record.get('ownerTeam'),
      riskLevel: record.get('riskLevel'),
      lastReviewed: record.get('lastReviewed')?.toString(),
      ownerTeamName: record.get('ownerTeamName'),
      versions: record.get('versions').filter((v: string) => v),
      approvals: record.get('approvals').filter((a: { team?: string }) => a.team)
    }))
    
    return {
      success: true,
      data: technologies,
      count: technologies.length
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch technologies'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
