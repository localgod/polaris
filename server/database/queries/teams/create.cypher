CREATE (t:Team {
  name: $name,
  email: $email,
  responsibilityArea: $responsibilityArea,
  createdAt: datetime()
})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CREATE',
  entityType: 'Team',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: ['name', 'email', 'responsibilityArea'],
  source: 'API',
  userId: $userId
})
RETURN t.name as name
