MATCH (team:Team {name: $name})
OPTIONAL MATCH (team)-[techApproval:APPROVES]->(tech:Technology)
RETURN team.name as teamName,
       collect(DISTINCT {
         technology: tech.name,
         type: tech.type,
         vendor: tech.vendor,
         time: techApproval.time,
         environment: techApproval.environment,
         approvedAt: techApproval.approvedAt,
         deprecatedAt: techApproval.deprecatedAt,
         eolDate: techApproval.eolDate,
         migrationTarget: techApproval.migrationTarget,
         notes: techApproval.notes,
         approvedBy: techApproval.approvedBy
       }) as technologyApprovals
