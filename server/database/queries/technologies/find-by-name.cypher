MATCH (t:Technology {name: $name})
OPTIONAL MATCH (team:Team)-[:OWNS]->(t)
OPTIONAL MATCH (t)-[:HAS_VERSION]->(v:Version)
OPTIONAL MATCH (c:Component)-[:IS_VERSION_OF]->(t)
OPTIONAL MATCH (sys:System)-[:USES]->(c)
OPTIONAL MATCH (vc:VersionConstraint)-[:GOVERNS]->(t)
OPTIONAL MATCH (approvalTeam:Team)-[techApproval:APPROVES]->(t)
OPTIONAL MATCH (t)-[:HAS_VERSION]->(approvedVersion:Version)
OPTIONAL MATCH (versionApprovalTeam:Team)-[versionApproval:APPROVES]->(approvedVersion)
RETURN t.name as name,
       t.type as type,
       t.domain as domain,
       t.vendor as vendor,
       t.lastReviewed as lastReviewed,
       team.name as ownerTeamName,
       team.email as ownerTeamEmail,
       collect(DISTINCT {
         version: v.version,
         releaseDate: v.releaseDate,
         eolDate: v.eolDate,
         approved: v.approved,
         notes: v.notes
       }) as versions,
       collect(DISTINCT {
         name: c.name,
         version: c.version,
         packageManager: c.packageManager
       }) as components,
       collect(DISTINCT sys.name) as systems,
       collect(DISTINCT {
         name: vc.name,
         severity: vc.severity,
         versionRange: vc.versionRange,
         status: vc.status
       }) as constraints,
       collect(DISTINCT {
         team: approvalTeam.name,
         time: techApproval.time,
         approvedAt: techApproval.approvedAt,
         deprecatedAt: techApproval.deprecatedAt,
         eolDate: techApproval.eolDate,
         migrationTarget: techApproval.migrationTarget,
         notes: techApproval.notes,
         approvedBy: techApproval.approvedBy
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
