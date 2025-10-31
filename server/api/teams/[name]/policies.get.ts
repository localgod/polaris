/**
 * @openapi
 * /teams/{name}/policies:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Get team policies
 *     description: |
 *       Retrieves policies enforced by and applicable to a specific team.
 *       
 *       Returns two categories:
 *       - **Enforced**: Policies this team is responsible for enforcing
 *       - **Subject To**: Policies that apply to this team
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
 *         description: Team policies retrieved successfully
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
 *                     enforced:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Policy'
 *                     subjectTo:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Policy'
 *                           - type: object
 *                             properties:
 *                               enforcedBy:
 *                                 type: string
 *                     enforcedCount:
 *                       type: integer
 *                     subjectToCount:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 team: frontend-team
 *                 enforced:
 *                   - name: react-version-policy
 *                     description: All React versions must be 18.x or higher
 *                     ruleType: version-constraint
 *                     severity: high
 *                     status: active
 *                 subjectTo:
 *                   - name: security-scanning-policy
 *                     description: All systems must have security scanning enabled
 *                     ruleType: security
 *                     severity: critical
 *                     status: active
 *                     enforcedBy: security-team
 *                 enforcedCount: 1
 *                 subjectToCount: 1
 *       400:
 *         description: Team name is required
 *       500:
 *         description: Failed to fetch team policies
 */
export default defineEventHandler(async (event) => {
  try {
    const teamName = getRouterParam(event, 'name')
    
    if (!teamName) {
      throw createError({
        statusCode: 400,
        message: 'Team name is required'
      })
    }
    
    const driver = useDriver()
    
    // Get policies enforced by this team
    const { records: enforcedRecords } = await driver.executeQuery(`
      MATCH (team:Team {name: $teamName})-[:ENFORCES]->(p:Policy)
      OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
      WITH p, collect(DISTINCT tech.name) as governedTechnologies
      RETURN p.name as name,
             p.description as description,
             p.ruleType as ruleType,
             p.severity as severity,
             p.effectiveDate as effectiveDate,
             p.expiryDate as expiryDate,
             p.scope as scope,
             p.status as status,
             governedTechnologies
      ORDER BY p.effectiveDate DESC
    `, { teamName })
    
    const enforcedPolicies = enforcedRecords.map(record => ({
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      scope: record.get('scope'),
      status: record.get('status'),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t)
    }))
    
    // Get policies this team is subject to
    const { records: subjectRecords } = await driver.executeQuery(`
      MATCH (team:Team {name: $teamName})-[:SUBJECT_TO]->(p:Policy)
      OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
      OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
      WITH p, enforcer, collect(DISTINCT tech.name) as governedTechnologies
      RETURN p.name as name,
             p.description as description,
             p.ruleType as ruleType,
             p.severity as severity,
             p.effectiveDate as effectiveDate,
             p.expiryDate as expiryDate,
             p.scope as scope,
             p.status as status,
             enforcer.name as enforcedBy,
             governedTechnologies
      ORDER BY p.effectiveDate DESC
    `, { teamName })
    
    const subjectToPolicies = subjectRecords.map(record => ({
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      scope: record.get('scope'),
      status: record.get('status'),
      enforcedBy: record.get('enforcedBy'),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t)
    }))
    
    return {
      success: true,
      data: {
        team: teamName,
        enforced: enforcedPolicies,
        subjectTo: subjectToPolicies,
        enforcedCount: enforcedPolicies.length,
        subjectToCount: subjectToPolicies.length
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team policies'
    return {
      success: false,
      error: errorMessage
    }
  }
})
