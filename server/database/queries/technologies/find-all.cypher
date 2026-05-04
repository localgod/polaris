MATCH (t:Technology)
OPTIONAL MATCH (team:Team)-[:OWNS]->(t)
OPTIONAL MATCH (t)-[:HAS_VERSION]->(v:Version)
OPTIONAL MATCH (comp:Component)-[:IS_VERSION_OF]->(t)
OPTIONAL MATCH (pol:VersionConstraint)-[:GOVERNS]->(t)
OPTIONAL MATCH (approvalTeam:Team)-[approval:APPROVES]->(t)
WITH t,
     team,
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
WITH collect({t: t, team: team, componentCount: componentCount, constraintCount: constraintCount, versions: versions, approvals: approvals}) as allRows, count(t) as total
UNWIND allRows as row
WITH row.t as t, row.team as team, row.componentCount as componentCount, row.constraintCount as constraintCount, row.versions as versions, row.approvals as approvals, total
RETURN t.name as name,
       t.type as type,
       t.domain as domain,
       t.vendor as vendor,
       t.lastReviewed as lastReviewed,
       team.name as ownerTeamName,
       componentCount,
       constraintCount,
       versions,
       approvals,
       total
ORDER BY {{ORDER_BY}}
SKIP toInteger($offset)
LIMIT toInteger($limit)
