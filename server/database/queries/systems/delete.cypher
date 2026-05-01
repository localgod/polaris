MATCH (s:System {name: $name})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'DELETE',
  entityType: 'System',
  entityId: s.name,
  entityLabel: s.name,
  changedFields: [],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
DETACH DELETE s
