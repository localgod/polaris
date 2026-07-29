MATCH (t:Team {name: $name})
SET t.name = $newName,
    t.email = $email,
    t.responsibilityArea = $responsibilityArea
WITH t, {
  operation: 'UPDATE',
  entityType: 'Team',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: $changedFields,
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
RETURN t.name as name
