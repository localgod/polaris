MATCH (t:Technology {name: $name})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'DELETE',
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: [],
  source: 'API',
  userId: $userId
})
DETACH DELETE t
