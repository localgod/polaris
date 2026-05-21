MATCH (t:Technology)
OPTIONAL MATCH (approvalTeam:Team)-[approval:APPROVES]->(t)
WITH t,
     collect(DISTINCT {
       team: approvalTeam.name,
       time: approval.time
     }) as approvals
RETURN t.name    as name,
       t.type    as type,
       t.domain  as domain,
       approvals
