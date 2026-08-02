// Best-effort AuditLog write for Technology mutations, run as a separate
// transaction AFTER the primary mutation has already committed (see
// BaseRepository.attachAuditLogBestEffort). For delete, the caller must run
// this BEFORE removing the node, since there's nothing left to attach an
// :AUDITS relationship to afterwards.
MATCH (t:Technology {name: $name})
WITH t, {
  operation: $operation,
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: $changedFields,
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(t)
