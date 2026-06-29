MATCH (vc:VersionConstraint {name: $name})
SET {{SET_CLAUSES}}
WITH vc
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'UPDATE',
  entityType: 'VersionConstraint',
  entityId: vc.name,
  entityLabel: vc.name,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(vc)
