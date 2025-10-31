/**
 * @openapi
 * /policies/{name}:
 *   get:
 *     tags:
 *       - Policies
 *     summary: Get policy details
 *     description: |
 *       Retrieves detailed information about a specific policy including:
 *       - Policy metadata and rules
 *       - Enforcing team
 *       - Teams subject to the policy
 *       - Technologies and versions governed by the policy
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Policy name
 *         example: react-version-policy
 *     responses:
 *       200:
 *         description: Policy details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Policy'
 *                     - type: object
 *                       properties:
 *                         enforcerTeam:
 *                           type: string
 *                         subjectTeams:
 *                           type: array
 *                           items:
 *                             type: string
 *                         governedTechnologies:
 *                           type: array
 *                           items:
 *                             type: string
 *                         governedVersions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               technology:
 *                                 type: string
 *                               version:
 *                                 type: string
 *             example:
 *               success: true
 *               data:
 *                 name: react-version-policy
 *                 description: All React versions must be 18.x or higher
 *                 ruleType: version-constraint
 *                 severity: high
 *                 status: active
 *                 enforcerTeam: frontend-platform
 *                 subjectTeams: ["frontend-team", "mobile-team"]
 *                 governedTechnologies: ["React"]
 *       400:
 *         description: Policy name is required
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Failed to fetch policy
 */
export default defineEventHandler(async (event) => {
  try {
    const rawName = getRouterParam(event, 'name')
    
    if (!rawName) {
      throw createError({
        statusCode: 400,
        message: 'Policy name is required'
      })
    }
    
    const name = decodeURIComponent(rawName)
    
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (p:Policy {name: $name})
      OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
      OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(p)
      OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
      OPTIONAL MATCH (p)-[:GOVERNS]->(v:Version)
      WITH p, enforcer,
           collect(DISTINCT subject.name) as subjectTeams,
           collect(DISTINCT tech.name) as governedTechnologies,
           collect(DISTINCT {technology: v.technologyName, version: v.version}) as governedVersions
      RETURN p.name as name,
             p.description as description,
             p.ruleType as ruleType,
             p.severity as severity,
             p.effectiveDate as effectiveDate,
             p.expiryDate as expiryDate,
             p.enforcedBy as enforcedBy,
             p.scope as scope,
             p.status as status,
             enforcer.name as enforcerTeam,
             subjectTeams,
             governedTechnologies,
             governedVersions
    `, { name })
    
    const record = getFirstRecordOrThrow(records, `Policy '${name}' not found`)
    
    const policy = {
      name: record.get('name'),
      description: record.get('description'),
      ruleType: record.get('ruleType'),
      severity: record.get('severity'),
      effectiveDate: record.get('effectiveDate')?.toString(),
      expiryDate: record.get('expiryDate')?.toString(),
      enforcedBy: record.get('enforcedBy'),
      scope: record.get('scope'),
      status: record.get('status'),
      enforcerTeam: record.get('enforcerTeam'),
      subjectTeams: record.get('subjectTeams').filter((t: string) => t),
      governedTechnologies: record.get('governedTechnologies').filter((t: string) => t),
      governedVersions: record.get('governedVersions').filter((v: { technology: string }) => v.technology)
    }
    
    return {
      success: true,
      data: policy
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policy'
    return {
      success: false,
      error: errorMessage
    }
  }
})
