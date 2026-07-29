MATCH (vc:VersionConstraint {name: $name})
WITH vc, {
  operation: 'DELETE',
  entityType: 'VersionConstraint',
  entityId: vc.name,
  entityLabel: vc.name,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
WITH vc
DETACH DELETE vc
