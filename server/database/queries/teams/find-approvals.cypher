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
         approvedBy: techApproval.approvedBy
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
