MATCH (t:Team {name: $name})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'DELETE',
  entityType: 'Team',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: [],
  changes: $changes,
  source: 'API',
  userId: $userId
})
DETACH DELETE t
