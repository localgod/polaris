export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')
    
    if (!name) {
      throw createError({
        statusCode: 400,
        message: 'Team name is required'
      })
    }
    
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(
      `
      MATCH (team:Team {name: $name})
      OPTIONAL MATCH (team)-[techApproval:APPROVES]->(tech:Technology)
      OPTIONAL MATCH (team)-[versionApproval:APPROVES]->(v:Version)
      OPTIONAL MATCH (versionTech:Technology)-[:HAS_VERSION]->(v)
      RETURN team.name as teamName,
             collect(DISTINCT {
               technology: tech.name,
               category: tech.category,
               vendor: tech.vendor,
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
               technology: versionTech.name,
               version: v.version,
               category: versionTech.category,
               vendor: versionTech.vendor,
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
    
    const record = getFirstRecordOrThrow(records, `Team '${name}' not found`)
    
    return {
      success: true,
      data: {
        team: record.get('teamName'),
        technologyApprovals: record.get('technologyApprovals').filter((a: { technology?: string }) => a.technology),
        versionApprovals: record.get('versionApprovals').filter((a: { technology?: string }) => a.technology)
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team approvals'
    throw createError({
      statusCode: 500,
      message: errorMessage
    })
  }
})
