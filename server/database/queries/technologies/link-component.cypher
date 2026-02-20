MATCH (t:Technology {name: $technologyName})
MATCH (c:Component {name: $componentName, version: $componentVersion})
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
  userId: $userId
})
CREATE (al)-[:AUDITS]->(t)
RETURN t.name as technologyName, c.name as componentName, c.version as componentVersion
