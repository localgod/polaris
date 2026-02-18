MATCH (t:Team {name: $name})
SET t.name = $newName,
    t.email = $email,
    t.responsibilityArea = $responsibilityArea
WITH t
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'UPDATE',
  entityType: 'Team',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: $changedFields,
  source: 'API',
  userId: $userId
})
RETURN t.name as name
