CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: $operation,
  entityType: $entityType,
  entityId: $entityId,
  entityLabel: $entityLabel,
  changedFields: $changedFields,
  changes: $changes,
  reason: $reason,
  source: $source,
  userId: $userId,
  realUserId: $realUserId
})
