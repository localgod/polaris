MATCH (p:Platform {name: $name})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'DELETE',
  entityType: 'Platform',
  entityId: p.name,
  entityLabel: p.name,
  changedFields: [],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
DETACH DELETE p
