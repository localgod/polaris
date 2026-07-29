MATCH (t:Technology {name: $name})
WITH t, {
  operation: 'DELETE',
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: [],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
WITH t
DETACH DELETE t
