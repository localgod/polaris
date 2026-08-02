// Best-effort AuditLog write for Waiver create/revoke, run as a separate
// transaction after the primary write (see
// BaseRepository.attachAuditLogBestEffort).
MATCH (w:Waiver {id: $waiverId})
WITH w, {
  operation: $operation,
  entityType: 'Waiver',
  entityId: w.id,
  entityLabel: w.id,
  changedFields: $changedFields,
  reason: $reason,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(w)
