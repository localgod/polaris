// Best-effort AuditLog write for License allowed-status mutations, run as a
// separate transaction AFTER the primary mutation has already committed
// (see BaseRepository.attachAuditLogBestEffort). Handles both single and
// bulk updates uniformly: $items is always an array of
// { id, entityLabel, operation, previousStatus, newStatus }, built in JS
// from the primary query's pre-update snapshot (one entry for a single
// update, N entries for a bulk update).
UNWIND $items AS item
MATCH (license:License {id: item.id})
WITH license, item, {
  operation: item.operation,
  entityType: 'License',
  entityId: license.id,
  entityLabel: item.entityLabel,
  previousStatus: item.previousStatus,
  newStatus: item.newStatus,
  changedFields: ['allowed'],
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(license)
