// Best-effort AuditLog write for System mutations, run as a separate
// transaction AFTER the primary mutation has already committed (see
// BaseRepository.attachAuditLogBestEffort). $operation, $entityLabel,
// $changedFields, $changes are supplied by the calling repository method.
MATCH (s:System {name: $name})
WITH s, {
  operation: $operation,
  entityType: 'System',
  entityId: s.name,
  entityLabel: $entityLabel,
  changedFields: $changedFields,
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(s)
