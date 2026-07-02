MATCH (p:Platform {name: $name})
OPTIONAL MATCH (team:Team)-[:STEWARDED_BY]->(p)
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
