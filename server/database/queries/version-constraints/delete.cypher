MATCH (vc:VersionConstraint {name: $name})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'DELETE',
  entityType: 'VersionConstraint',
  entityId: vc.name,
  entityLabel: vc.name,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
WITH vc
DETACH DELETE vc
