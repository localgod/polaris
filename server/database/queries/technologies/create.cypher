CREATE (t:Technology {
  name: $name,
  category: $category,
  vendor: $vendor
})
WITH t
OPTIONAL MATCH (team:Team {name: $ownerTeam})
FOREACH (_ IN CASE WHEN team IS NOT NULL THEN [1] ELSE [] END |
  CREATE (team)-[:OWNS]->(t)
)
WITH t
CALL (t) {
  WITH t
  WHERE $componentName IS NOT NULL
  MATCH (c:Component)
  WHERE c.name = $componentName
    AND ($componentPackageManager IS NULL AND c.packageManager IS NULL
         OR c.packageManager = $componentPackageManager)
  MERGE (c)-[:IS_VERSION_OF]->(t)
}
WITH t
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CREATE',
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: ['name', 'category', 'vendor'],
  source: 'API',
  userId: $userId
})
CREATE (a)-[:AUDITS]->(t)
RETURN t.name as name
