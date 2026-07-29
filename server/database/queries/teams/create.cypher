CREATE (t:Team {
  name: $name,
  email: $email,
  responsibilityArea: $responsibilityArea,
  createdAt: datetime()
})
WITH t, {
  operation: 'CREATE',
  entityType: 'Team',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: ['name', 'email', 'responsibilityArea'],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
RETURN t.name as name
