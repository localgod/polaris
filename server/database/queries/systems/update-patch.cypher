MATCH (s:System {name: $name})
SET {{SET_CLAUSES}}
WITH s, {
  operation: 'UPDATE',
  entityType: 'System',
  entityId: s.name,
  entityLabel: s.name,
  changedFields: $changedFields,
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(s)
RETURN s {
  .*,
  ownerTeam: [(s)<-[:OWNS]-(t:Team) | t.name][0]
} AS system
