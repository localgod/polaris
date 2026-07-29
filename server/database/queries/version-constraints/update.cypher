MATCH (vc:VersionConstraint {name: $name})
SET {{SET_CLAUSES}}
WITH vc, {
  operation: 'UPDATE',
  entityType: 'VersionConstraint',
  entityId: vc.name,
  entityLabel: vc.name,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(vc)
