export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const team = query.team as string
    const technology = query.technology as string
    const version = query.version as string | undefined
    
    if (!team || !technology) {
      throw createError({
        statusCode: 400,
        message: 'Team and technology parameters are required'
      })
    }
    
    const driver = useDriver()
    
    // Query with approval resolution hierarchy: version > technology > default (restricted)
    const { records } = await driver.executeQuery(
      `
      MATCH (team:Team {name: $team})
      MATCH (tech:Technology {name: $technology})
      OPTIONAL MATCH (tech)-[:HAS_VERSION]->(v:Version {version: $version})
      OPTIONAL MATCH (team)-[versionApproval:APPROVES]->(v)
      OPTIONAL MATCH (team)-[techApproval:APPROVES]->(tech)
      RETURN team.name as teamName,
             tech.name as technologyName,
             tech.category as category,
             tech.vendor as vendor,
             v.version as version,
             CASE
               WHEN versionApproval IS NOT NULL THEN {
                 level: 'version',
                 time: versionApproval.time,
                 approvedAt: versionApproval.approvedAt,
                 deprecatedAt: versionApproval.deprecatedAt,
                 eolDate: versionApproval.eolDate,
                 migrationTarget: versionApproval.migrationTarget,
                 notes: versionApproval.notes,
                 approvedBy: versionApproval.approvedBy
               }
               WHEN techApproval IS NOT NULL THEN {
                 level: 'technology',
                 time: techApproval.time,
                 approvedAt: techApproval.approvedAt,
                 deprecatedAt: techApproval.deprecatedAt,
                 eolDate: techApproval.eolDate,
                 migrationTarget: techApproval.migrationTarget,
                 notes: techApproval.notes,
                 approvedBy: techApproval.approvedBy,
                 versionConstraint: techApproval.versionConstraint
               }
               ELSE {
                 level: 'default',
                 time: 'eliminate',
                 notes: 'No explicit approval found for this team'
               }
             END as approval
      `,
      { team, technology, version: version || null }
    )
    
    const record = getFirstRecordOrThrow(records, `Team '${team}' or technology '${technology}' not found`)
    
    return {
      success: true,
      data: {
        team: record.get('teamName'),
        technology: record.get('technologyName'),
        category: record.get('category'),
        vendor: record.get('vendor'),
        version: record.get('version'),
        approval: record.get('approval')
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to check approval status'
    throw createError({
      statusCode: 500,
      message: errorMessage
    })
  }
})
