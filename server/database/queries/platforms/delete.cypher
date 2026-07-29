MATCH (p:Platform {name: $name})
WITH p, {
  operation: 'DELETE',
  entityType: 'Platform',
  entityId: p.name,
  entityLabel: p.name,
  changedFields: [],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
WITH p
DETACH DELETE p
