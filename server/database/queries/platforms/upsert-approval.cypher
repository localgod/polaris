MATCH (team:Team {name: $teamName})
MATCH (p:Platform {name: $platformName})
// Find existing approval for this (team, platform, environment) triple.
// environment IS NULL matches both absent-property and explicit-null (blanket approvals).
OPTIONAL MATCH (team)-[existing:APPROVES]->(p)
  WHERE (existing.environment IS NULL AND $environment IS NULL)
     OR existing.environment = $environment
WITH team, p, existing, (existing IS NULL) AS isNew
FOREACH (_ IN CASE WHEN isNew THEN [1] ELSE [] END |
  CREATE (team)-[:APPROVES {
    environment: $environment,
    time: $time,
    approvedAt: datetime(),
    approvedBy: $approvedBy,
    notes: $notes
  }]->(p)
)
FOREACH (_ IN CASE WHEN NOT isNew THEN [1] ELSE [] END |
  SET existing.time = $time,
      existing.approvedBy = $approvedBy,
      existing.notes = $notes
)
// Re-match to get the relationship regardless of which branch ran
WITH team, p, isNew
MATCH (team)-[a:APPROVES]->(p)
  WHERE (a.environment IS NULL AND $environment IS NULL)
     OR a.environment = $environment
WITH team, p, a, isNew
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: CASE WHEN isNew THEN 'CREATE' ELSE 'UPDATE' END,
  entityType: 'PlatformApproval',
  entityId: p.name,
  entityLabel: team.name + ' -> ' + p.name + ' (' + $time + ')',
  changedFields: ['time', 'notes'],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (al)-[:AUDITS]->(p)
RETURN a.time as time, team.name as team
