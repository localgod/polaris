MATCH (p:Policy {name: $name})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'DELETE',
  entityType: 'Policy',
  entityId: p.name,
  entityLabel: p.name,
  changedFields: [],
  source: 'API',
  userId: $userId
})
DETACH DELETE p
