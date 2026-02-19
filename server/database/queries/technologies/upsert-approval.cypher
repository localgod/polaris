MATCH (team:Team {name: $teamName})
MATCH (t:Technology {name: $technologyName})
MERGE (team)-[a:APPROVES]->(t)
SET a.time = $time,
    a.approvedAt = CASE WHEN a.approvedAt IS NULL THEN datetime() ELSE a.approvedAt END,
    a.approvedBy = $approvedBy,
    a.notes = $notes
WITH t, team, a
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: CASE WHEN a.approvedAt = datetime() THEN 'CREATE' ELSE 'UPDATE' END,
  entityType: 'TechnologyApproval',
  entityId: t.name,
  entityLabel: team.name + ' -> ' + t.name + ' (' + $time + ')',
  changedFields: ['time', 'notes'],
  source: 'API',
  userId: $userId
})
CREATE (al)-[:AUDITS]->(t)
RETURN a.time as time, team.name as team
