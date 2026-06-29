MATCH (u:User {id: $userId})
OPTIONAL MATCH (performer:User {id: $performedBy})
UNWIND $events AS evt
OPTIONAL MATCH (t:Team {name: evt.team})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: evt.operation,
  entityType: 'User',
  entityId: $userId,
  entityLabel: coalesce(u.name, u.email),
  previousStatus: null,
  newStatus: evt.team,
  changedFields: ['teams'],
  reason: CASE evt.operation
    WHEN 'ADD_TEAM_MEMBER' THEN 'Added to team: ' + evt.team
    WHEN 'REMOVE_TEAM_MEMBER' THEN 'Removed from team: ' + evt.team
  END,
  source: 'API',
  userId: $performedBy,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(u)
FOREACH (_ IN CASE WHEN t IS NOT NULL THEN [1] ELSE [] END |
  CREATE (a)-[:AUDITS]->(t)
)
FOREACH (_ IN CASE WHEN performer IS NOT NULL THEN [1] ELSE [] END |
  CREATE (a)-[:PERFORMED_BY]->(performer)
)
