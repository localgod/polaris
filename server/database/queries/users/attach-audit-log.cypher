// Best-effort AuditLog write for single-User mutations (create-pending,
// claim-invite, update-role), run as a separate transaction AFTER the
// primary mutation has already committed (see
// BaseRepository.attachAuditLogBestEffort). $performedBy doubles as both
// the AuditLog's own userId property and the optional PERFORMED_BY link —
// when there's no distinct performer (e.g. a self-service invite claim),
// the caller passes null and the OPTIONAL MATCH simply finds nothing.
//
// Not used by assignTeams()'s team-membership audit — that operation
// already writes its own already-decoupled, multi-entity audit events via
// users/create-team-audit-events.cypher.
MATCH (u:User {id: $userId})
OPTIONAL MATCH (performer:User {id: $performedBy})
WITH u, performer, {
  operation: $operation,
  entityType: 'User',
  entityId: u.id,
  entityLabel: $entityLabel,
  previousStatus: $previousStatus,
  newStatus: $newStatus,
  changedFields: $changedFields,
  reason: $reason,
  source: $source,
  userId: $performedBy,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(u)
FOREACH (_ IN CASE WHEN performer IS NOT NULL THEN [1] ELSE [] END |
  CREATE (a)-[:PERFORMED_BY]->(performer)
)
