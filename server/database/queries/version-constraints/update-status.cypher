MATCH (vc:VersionConstraint {name: $name})
SET vc.status = $status,
    vc.updatedAt = datetime(),
    vc.statusChangedAt = datetime(),
    vc.statusChangeReason = $reason
WITH vc
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: CASE $newStatus
    WHEN 'active' THEN 'ACTIVATE'
    WHEN 'archived' THEN 'ARCHIVE'
    ELSE 'DEACTIVATE'
  END,
  entityType: 'VersionConstraint',
  entityId: vc.name,
  entityLabel: vc.name,
  previousStatus: $previousStatus,
  newStatus: $newStatus,
  changedFields: ['status'],
  reason: $reason,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(vc)
