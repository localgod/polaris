MATCH (t:Technology)
OPTIONAL MATCH (team:Team)-[:OWNS]->(t)
OPTIONAL MATCH (t)-[:HAS_VERSION]->(v:Version)
OPTIONAL MATCH (comp:Component)-[:IS_VERSION_OF]->(t)
OPTIONAL MATCH (pol:VersionConstraint)-[:GOVERNS]->(t)
OPTIONAL MATCH (approvalTeam:Team)-[approval:APPROVES]->(t)
RETURN t.name as name,
       t.category as category,
       t.vendor as vendor,
       t.lastReviewed as lastReviewed,
       team.name as ownerTeamName,
       count(DISTINCT comp) as componentCount,
       count(DISTINCT pol) as constraintCount,
       collect(DISTINCT v.version) as versions,
       collect(DISTINCT {
         team: approvalTeam.name,
         time: approval.time,
         approvedAt: approval.approvedAt,
         deprecatedAt: approval.deprecatedAt,
         eolDate: approval.eolDate,
         migrationTarget: approval.migrationTarget,
         notes: approval.notes,
         approvedBy: approval.approvedBy
       }) as approvals
ORDER BY t.category, t.name
