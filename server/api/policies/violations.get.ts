/**
 * @openapi
 * /policies/violations:
 *   get:
 *     tags:
 *       - Policies
 *     summary: Get policy violations
 *     description: |
 *       Retrieves all policy violations across the organization.
 *       
 *       A violation occurs when:
 *       - A team uses a technology (USES relationship)
 *       - The team does not have approval for that technology (no APPROVES relationship)
 *       - An active policy governs that technology
 *       - The team is subject to that policy
 *       
 *       Results are ordered by severity (critical first) then by team and technology name.
 *     parameters:
 *       - in: query
 *         name: severity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [critical, error, warning, info]
 *         description: Filter by policy severity
 *       - in: query
 *         name: team
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by team name
 *       - in: query
 *         name: technology
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by technology name
 *     responses:
 *       200:
 *         description: Policy violations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       team:
 *                         type: string
 *                       technology:
 *                         type: string
 *                       technologyCategory:
 *                         type: string
 *                       riskLevel:
 *                         type: string
 *                       policy:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           severity:
 *                             type: string
 *                           ruleType:
 *                             type: string
 *                           enforcedBy:
 *                             type: string
 *                 count:
 *                   type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     critical:
 *                       type: integer
 *                     error:
 *                       type: integer
 *                     warning:
 *                       type: integer
 *                     info:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 - team: frontend-team
 *                   technology: jQuery
 *                   technologyCategory: library
 *                   riskLevel: medium
 *                   policy:
 *                     name: deprecated-libraries
 *                     description: Deprecated libraries must not be used
 *                     severity: error
 *                     ruleType: deprecation
 *                     enforcedBy: architecture-team
 *               count: 1
 *               summary:
 *                 critical: 0
 *                 error: 1
 *                 warning: 0
 *                 info: 0
 *       500:
 *         description: Failed to fetch policy violations
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const severity = query.severity as string | undefined
    const team = query.team as string | undefined
    const technology = query.technology as string | undefined

    const driver = useDriver()

    // Find policy violations by checking:
    // 1. Technologies used by teams (USES) but not approved (no APPROVES)
    // 2. Technologies governed by active policies
    // 3. Teams subject to those policies
    let cypher = `
      MATCH (team:Team)-[:USES]->(tech:Technology)
      WHERE NOT (team)-[:APPROVES]->(tech)
      MATCH (policy:Policy {status: 'active'})-[:GOVERNS]->(tech)
      MATCH (team)-[:SUBJECT_TO]->(policy)
      OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
    `

    const conditions: string[] = []
    const params: Record<string, string> = {}

    if (severity) {
      conditions.push('policy.severity = $severity')
      params.severity = severity
    }

    if (team) {
      conditions.push('team.name = $team')
      params.team = team
    }

    if (technology) {
      conditions.push('tech.name = $technology')
      params.technology = technology
    }

    if (conditions.length > 0) {
      cypher += ' AND ' + conditions.join(' AND ')
    }

    cypher += `
      RETURN team.name as teamName,
             tech.name as technologyName,
             tech.category as technologyCategory,
             tech.riskLevel as riskLevel,
             policy.name as policyName,
             policy.description as policyDescription,
             policy.severity as severity,
             policy.ruleType as ruleType,
             enforcer.name as enforcedBy
      ORDER BY 
        CASE policy.severity
          WHEN 'critical' THEN 1
          WHEN 'error' THEN 2
          WHEN 'warning' THEN 3
          WHEN 'info' THEN 4
        END,
        team.name,
        tech.name
    `

    const { records } = await driver.executeQuery(cypher, params)

    const violations = records.map(record => ({
      team: record.get('teamName'),
      technology: record.get('technologyName'),
      technologyCategory: record.get('technologyCategory'),
      riskLevel: record.get('riskLevel'),
      policy: {
        name: record.get('policyName'),
        description: record.get('policyDescription'),
        severity: record.get('severity'),
        ruleType: record.get('ruleType'),
        enforcedBy: record.get('enforcedBy')
      }
    }))

    // Group violations by severity
    const summary = {
      critical: violations.filter(v => v.policy.severity === 'critical').length,
      error: violations.filter(v => v.policy.severity === 'error').length,
      warning: violations.filter(v => v.policy.severity === 'warning').length,
      info: violations.filter(v => v.policy.severity === 'info').length
    }

    return {
      success: true,
      data: violations,
      count: violations.length,
      summary
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policy violations'
    return {
      success: false,
      error: errorMessage,
      data: [],
      count: 0,
      summary: { critical: 0, error: 0, warning: 0, info: 0 }
    }
  }
})
