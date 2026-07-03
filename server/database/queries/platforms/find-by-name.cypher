MATCH (p:Platform {name: $name})
// Pin a single, deterministic steward team (alphabetically first) before
// matching approvals, so a Platform with more than one steward doesn't
// multiply into duplicate rows (stewardTeamName/stewardTeamEmail are single
// fields, not lists). The ORDER BY before collect() is required -- Cypher's
// collect() has no guaranteed order otherwise, so picking [0] without it
// can return a different team on every execution.
OPTIONAL MATCH (stewardTeam:Team)-[:STEWARDED_BY]->(p)
WITH p, stewardTeam
ORDER BY stewardTeam.name
WITH p, collect(stewardTeam)[0] as team
OPTIONAL MATCH (approvalTeam:Team)-[approval:APPROVES]->(p)
RETURN p.name as name,
       p.type as type,
       p.domain as domain,
       p.vendor as vendor,
       team.name as stewardTeamName,
       team.email as stewardTeamEmail,
       collect(DISTINCT {
         team: approvalTeam.name,
         time: approval.time,
         environment: approval.environment,
         approvedAt: approval.approvedAt,
         deprecatedAt: approval.deprecatedAt,
         eolDate: approval.eolDate,
         migrationTarget: approval.migrationTarget,
         notes: approval.notes,
         approvedBy: approval.approvedBy
       }) as approvals
