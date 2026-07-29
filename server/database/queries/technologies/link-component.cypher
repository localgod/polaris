// Matches by full package identity, not just name+version — see create-from-component.cypher
// for why bare name isn't a safe key (unrelated packages can share a name and, coincidentally,
// a version string, across npm scopes or ecosystems).
MATCH (t:Technology {name: $technologyName})
MATCH (c:Component {name: $componentName, version: $componentVersion})
WHERE coalesce(c.`group`, '') = coalesce($componentGroup, '')
  AND coalesce(c.packageManager, '') = coalesce($componentPackageManager, '')
MERGE (c)-[:IS_VERSION_OF]->(t)
WITH t, c
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'LINK',
  entityType: 'TechnologyComponent',
  entityId: t.name,
  entityLabel: c.name + '@' + c.version + ' -> ' + t.name,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (al)-[:AUDITS]->(t)
RETURN t.name as technologyName, c.name as componentName, c.version as componentVersion
