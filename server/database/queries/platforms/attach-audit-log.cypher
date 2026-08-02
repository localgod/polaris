// Best-effort AuditLog write for Platform mutations, run as a separate
// transaction AFTER the primary mutation has already committed (see
// BaseRepository.attachAuditLogBestEffort). For delete, the caller must run
// this BEFORE removing the node, since there's nothing left to attach an
// :AUDITS relationship to afterwards.
MATCH (p:Platform {name: $name})
WITH p, {
  operation: $operation,
  entityType: 'Platform',
  entityId: p.name,
  entityLabel: p.name,
  changedFields: $changedFields,
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(p)
