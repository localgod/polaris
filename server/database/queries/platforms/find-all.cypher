MATCH (p:Platform)
OPTIONAL MATCH (team:Team)-[:STEWARDED_BY]->(p)
OPTIONAL MATCH (approvalTeam:Team)-[approval:APPROVES]->(p)
WITH p,
     team,
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
WITH collect({p: p, team: team, approvals: approvals}) as allRows, count(p) as total
UNWIND allRows as row
WITH row.p as p, row.team as team, row.approvals as approvals, total
RETURN p.name as name,
       p.type as type,
       p.domain as domain,
       p.vendor as vendor,
       team.name as stewardTeamName,
       approvals,
       total
ORDER BY {{ORDER_BY}}
SKIP toInteger($offset)
LIMIT toInteger($limit)
