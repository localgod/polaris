// Best-effort AuditLog write for VersionConstraint mutations, run as a
// separate transaction AFTER the primary mutation has already committed
// (see BaseRepository.attachAuditLogBestEffort). For delete, the caller
// must run this BEFORE removing the node, since there's nothing left to
// attach an :AUDITS relationship to afterwards.
MATCH (vc:VersionConstraint {name: $name})
WITH vc, {
  operation: $operation,
  entityType: 'VersionConstraint',
  entityId: vc.name,
  entityLabel: vc.name,
  changedFields: $changedFields,
  previousStatus: $previousStatus,
  newStatus: $newStatus,
  reason: $reason,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(vc)
