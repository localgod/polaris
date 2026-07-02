// Creates a Technology and links every currently-unlinked Component sharing
// $componentName to it, atomically — Technology can never exist without at
// least one linked Component (see docs/architecture/decisions/
// 0004-technology-requires-component.md). If zero components match (none
// exist with this name, or all are already linked elsewhere), nothing is
// created and zero rows are returned so the caller can reject the request.
//
MATCH (c:Component {name: $componentName})
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
WITH collect(c) AS components
WHERE size(components) > 0
CREATE (t:Technology {
  name: $name,
  type: $type,
  domain: $domain,
  vendor: $vendor
})
WITH t, components
UNWIND components AS c
CREATE (c)-[:IS_VERSION_OF]->(t)
WITH t, count(c) AS linkedCount
OPTIONAL MATCH (team:Team {name: $ownerTeam})
FOREACH (_ IN CASE WHEN team IS NOT NULL THEN [1] ELSE [] END |
  CREATE (team)-[:STEWARDED_BY]->(t)
)
WITH t, linkedCount
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CREATE',
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: ['name', 'type', 'domain', 'vendor', 'componentName'],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(t)
RETURN t.name as name, linkedCount
