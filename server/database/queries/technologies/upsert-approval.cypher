MATCH (team:Team {name: $teamName})
MATCH (t:Technology {name: $technologyName})
// Find existing approval for this (team, technology, environment) triple.
// environment IS NULL matches both absent-property and explicit-null (blanket approvals).
OPTIONAL MATCH (team)-[existing:APPROVES]->(t)
  WHERE (existing.environment IS NULL AND $environment IS NULL)
     OR existing.environment = $environment
WITH team, t, existing, (existing IS NULL) AS isNew
FOREACH (_ IN CASE WHEN isNew THEN [1] ELSE [] END |
  CREATE (team)-[:APPROVES {
    environment: $environment,
    time: $time,
    approvedAt: datetime(),
    approvedBy: $approvedBy,
    notes: $notes
  }]->(t)
)
FOREACH (_ IN CASE WHEN NOT isNew THEN [1] ELSE [] END |
  SET existing.time = $time,
      existing.approvedBy = $approvedBy,
      existing.notes = $notes
)
// Re-match to get the relationship regardless of which branch ran
WITH team, t, isNew
MATCH (team)-[a:APPROVES]->(t)
  WHERE (a.environment IS NULL AND $environment IS NULL)
     OR a.environment = $environment
WITH team, t, a, isNew
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: CASE WHEN isNew THEN 'CREATE' ELSE 'UPDATE' END,
  entityType: 'TechnologyApproval',
  entityId: t.name,
  entityLabel: team.name + ' -> ' + t.name + ' (' + $time + ')',
  changedFields: ['time', 'notes', 'team', 'environment'],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId,
  correlationId: $correlationId
})
CREATE (al)-[:AUDITS]->(t)
RETURN a.time as time, team.name as team
