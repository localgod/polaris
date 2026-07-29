// Shared AuditLog-write fragment, included into other query files via the
// {{AUDIT_LOG_WRITE}} placeholder (see loadQueryWithAudit in
// server/utils/query-loader.ts). Callers bind an `auditFields` map in a
// preceding WITH clause containing whichever of the keys below apply.
// Neo4j returns null for a map key that was never set, and a property set
// to null is simply omitted from the created node — so a caller that
// leaves out e.g. `previousStatus` gets exactly the same node shape as
// if that property had never been written at all.
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: auditFields.operation,
  entityType: auditFields.entityType,
  entityId: auditFields.entityId,
  entityLabel: auditFields.entityLabel,
  previousStatus: auditFields.previousStatus,
  newStatus: auditFields.newStatus,
  changedFields: auditFields.changedFields,
  changes: auditFields.changes,
  reason: auditFields.reason,
  source: auditFields.source,
  userId: auditFields.userId,
  realUserId: auditFields.realUserId,
  correlationId: auditFields.correlationId,
  requestId: auditFields.requestId,
  metadata: auditFields.metadata
})
