CREATE (p:Platform {
  name: $name,
  type: $type,
  domain: $domain,
  vendor: $vendor
})
WITH p
OPTIONAL MATCH (team:Team {name: $stewardTeam})
FOREACH (_ IN CASE WHEN team IS NOT NULL THEN [1] ELSE [] END |
  CREATE (team)-[:STEWARDED_BY]->(p)
)
WITH p
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CREATE',
  entityType: 'Platform',
  entityId: p.name,
  entityLabel: p.name,
  changedFields: ['name', 'type', 'domain', 'vendor'],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(p)
RETURN p.name as name
