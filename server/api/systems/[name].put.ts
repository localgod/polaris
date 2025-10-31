/**
 * @openapi
 * /systems/{name}:
 *   put:
 *     tags:
 *       - Systems
 *     summary: Fully update/replace a system
 *     description: |
 *       Replaces all system fields. All required fields must be provided.
 *       
 *       **Authorization:** Team Owner - User must belong to the team that owns the system
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - ownerTeam
 *               - businessCriticality
 *               - environment
 *             properties:
 *               domain:
 *                 type: string
 *               ownerTeam:
 *                 type: string
 *               businessCriticality:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               environment:
 *                 type: string
 *                 enum: [dev, test, staging, prod]
 *               description:
 *                 type: string
 *           example:
 *             domain: customer-experience
 *             ownerTeam: frontend-team
 *             businessCriticality: critical
 *             environment: prod
 *             description: Customer-facing web portal
 *     responses:
 *       200:
 *         description: System updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *       400:
 *         description: System name is required or missing required fields
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User does not belong to team that owns this system
 *       404:
 *         description: System not found
 *       422:
 *         description: Validation error - invalid field values
 */
export default defineEventHandler(async (event) => {
  await requireAuthorization(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'System name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  
  await validateTeamOwnership(event, 'System', name)
  
  const body = await readBody(event)
  
  // Validate ALL required fields for PUT (full replacement)
  if (!body.domain || !body.ownerTeam || !body.businessCriticality || !body.environment) {
    throw createError({
      statusCode: 422,
      message: 'All required fields must be provided for full update: domain, ownerTeam, businessCriticality, environment'
    })
  }
  
  // Validate businessCriticality
  const validCriticalities = ['critical', 'high', 'medium', 'low']
  if (!validCriticalities.includes(body.businessCriticality)) {
    throw createError({
      statusCode: 422,
      message: 'Invalid business criticality value. Must be one of: critical, high, medium, low'
    })
  }
  
  // Validate environment
  const validEnvironments = ['dev', 'test', 'staging', 'prod']
  if (!validEnvironments.includes(body.environment)) {
    throw createError({
      statusCode: 422,
      message: 'Invalid environment value. Must be one of: dev, test, staging, prod'
    })
  }

  const driver = useDriver()
  
  // Check if new owner team exists
  const { records: teamRecords } = await driver.executeQuery(`
    MATCH (t:Team {name: $ownerTeam})
    RETURN t
  `, { ownerTeam: body.ownerTeam })
  
  if (teamRecords.length === 0) {
    throw createError({
      statusCode: 422,
      message: `Team '${body.ownerTeam}' not found`
    })
  }
  
  // Replace entire resource
  const { records } = await driver.executeQuery(`
    MATCH (s:System {name: $name})
    MATCH (team:Team {name: $ownerTeam})
    
    // Remove old ownership
    OPTIONAL MATCH (s)<-[oldOwns:OWNS]-(:Team)
    DELETE oldOwns
    
    // Set all properties
    SET s.domain = $domain,
        s.businessCriticality = $businessCriticality,
        s.environment = $environment,
        s.description = $description,
        s.sourceCodeType = $sourceCodeType,
        s.hasSourceAccess = $hasSourceAccess
    
    // Create new ownership
    MERGE (team)-[:OWNS]->(s)
    
    RETURN s {
      .*,
      ownerTeam: team.name
    } as system
  `, {
    name,
    domain: body.domain,
    ownerTeam: body.ownerTeam,
    businessCriticality: body.businessCriticality,
    environment: body.environment,
    description: body.description || null,
    sourceCodeType: body.sourceCodeType || 'unknown',
    hasSourceAccess: body.hasSourceAccess || false
  })
  
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
