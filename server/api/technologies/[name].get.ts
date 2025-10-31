/**
 * @openapi
 * /technologies/{name}:
 *   get:
 *     tags:
 *       - Technologies
 *     summary: Get technology details
 *     description: |
 *       Retrieves detailed information about a specific technology including versions, components, systems, policies, and approvals.
 *       
 *       Returns comprehensive data about:
 *       - Technology metadata (category, vendor, risk level)
 *       - All versions with release and EOL dates
 *       - Components using this technology
 *       - Systems that depend on it
 *       - Applicable policies
 *       - Technology-level and version-specific approvals
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name (e.g., "React", "PostgreSQL")
 *         example: React
 *     responses:
 *       200:
 *         description: Technology details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     category:
 *                       type: string
 *                     vendor:
 *                       type: string
 *                     approvedVersionRange:
 *                       type: string
 *                     ownerTeam:
 *                       type: string
 *                     riskLevel:
 *                       type: string
 *                     lastReviewed:
 *                       type: string
 *                     ownerTeamName:
 *                       type: string
 *                     ownerTeamEmail:
 *                       type: string
 *                     versions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     components:
 *                       type: array
 *                       items:
 *                         type: object
 *                     systems:
 *                       type: array
 *                       items:
 *                         type: string
 *                     policies:
 *                       type: array
 *                       items:
 *                         type: object
 *                     technologyApprovals:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TechnologyApproval'
 *                     versionApprovals:
 *                       type: array
 *                       items:
 *                         type: object
 *             example:
 *               success: true
 *               data:
 *                 name: React
 *                 category: framework
 *                 vendor: Meta
 *                 approvedVersionRange: ">=18.0.0 <19.0.0"
 *                 ownerTeam: Frontend Platform
 *                 riskLevel: low
 *                 lastReviewed: "2025-10-01"
 *                 ownerTeamName: Frontend Platform
 *                 ownerTeamEmail: frontend-platform@company.com
 *                 versions: ["18.2.0", "18.3.1"]
 *                 technologyApprovals:
 *                   - team: Frontend Platform
 *                     time: invest
 *                     approvedAt: "2025-10-21T19:23:55.763Z"
 *                     approvedBy: Frontend Lead
 *                     notes: Primary framework for customer-facing applications
 *       400:
 *         description: Technology name is required
 *       404:
 *         description: Technology not found
 *       500:
 *         description: Failed to fetch technology
 */
export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')
    
    if (!name) {
      throw createError({
        statusCode: 400,
        message: 'Technology name is required'
      })
    }
    
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(
      `
      MATCH (t:Technology {name: $name})
      OPTIONAL MATCH (team:Team)-[:OWNS]->(t)
      OPTIONAL MATCH (t)-[:HAS_VERSION]->(v:Version)
      OPTIONAL MATCH (c:Component)-[:IS_VERSION_OF]->(t)
      OPTIONAL MATCH (sys:System)-[:USES]->(c)
      OPTIONAL MATCH (p:Policy)-[:APPLIES_TO]->(t)
      OPTIONAL MATCH (approvalTeam:Team)-[techApproval:APPROVES]->(t)
      OPTIONAL MATCH (t)-[:HAS_VERSION]->(approvedVersion:Version)
      OPTIONAL MATCH (versionApprovalTeam:Team)-[versionApproval:APPROVES]->(approvedVersion)
      RETURN t.name as name,
             t.category as category,
             t.vendor as vendor,
             t.approvedVersionRange as approvedVersionRange,
             t.ownerTeam as ownerTeam,
             t.riskLevel as riskLevel,
             t.lastReviewed as lastReviewed,
             team.name as ownerTeamName,
             team.email as ownerTeamEmail,
             collect(DISTINCT {
               version: v.version,
               releaseDate: v.releaseDate,
               eolDate: v.eolDate,
               approved: v.approved,
               cvssScore: v.cvssScore,
               notes: v.notes
             }) as versions,
             collect(DISTINCT {
               name: c.name,
               version: c.version,
               packageManager: c.packageManager
             }) as components,
             collect(DISTINCT sys.name) as systems,
             collect(DISTINCT {
               name: p.name,
               severity: p.severity,
               ruleType: p.ruleType
             }) as policies,
             collect(DISTINCT {
               team: approvalTeam.name,
               time: techApproval.time,
               approvedAt: techApproval.approvedAt,
               deprecatedAt: techApproval.deprecatedAt,
               eolDate: techApproval.eolDate,
               migrationTarget: techApproval.migrationTarget,
               notes: techApproval.notes,
               approvedBy: techApproval.approvedBy,
               versionConstraint: techApproval.versionConstraint
             }) as technologyApprovals,
             collect(DISTINCT {
               team: versionApprovalTeam.name,
               version: approvedVersion.version,
               time: versionApproval.time,
               approvedAt: versionApproval.approvedAt,
               deprecatedAt: versionApproval.deprecatedAt,
               eolDate: versionApproval.eolDate,
               migrationTarget: versionApproval.migrationTarget,
               notes: versionApproval.notes,
               approvedBy: versionApproval.approvedBy
             }) as versionApprovals
      `,
      { name }
    )
    
    const record = getFirstRecordOrThrow(records, `Technology '${name}' not found`)
    
    return {
      success: true,
      data: {
        name: record.get('name'),
        category: record.get('category'),
        vendor: record.get('vendor'),
        approvedVersionRange: record.get('approvedVersionRange'),
        ownerTeam: record.get('ownerTeam'),
        riskLevel: record.get('riskLevel'),
        lastReviewed: record.get('lastReviewed')?.toString(),
        ownerTeamName: record.get('ownerTeamName'),
        ownerTeamEmail: record.get('ownerTeamEmail'),
        versions: record.get('versions').filter((v: { version?: string }) => v.version),
        components: record.get('components').filter((c: { name?: string }) => c.name),
        systems: record.get('systems').filter((s: string) => s),
        policies: record.get('policies').filter((p: { name?: string }) => p.name),
        technologyApprovals: record.get('technologyApprovals').filter((a: { team?: string }) => a.team),
        versionApprovals: record.get('versionApprovals').filter((a: { team?: string }) => a.team)
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch technology'
    throw createError({
      statusCode: 500,
      message: errorMessage
    })
  }
})
