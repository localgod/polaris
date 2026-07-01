MATCH (t:Technology {name: $technologyName})
MATCH (c:Component {purl: $purl})
MERGE (c)-[:IS_VERSION_OF]->(t)
WITH t, c
OPTIONAL MATCH (s:System)-[:USES]->(c)
WITH t, c, collect(DISTINCT s.name) AS affectedSystems
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'LINK',
  entityType: 'TechnologyComponent',
  entityId: t.name,
  entityLabel: c.purl + ' -> ' + t.name,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (al)-[:AUDITS]->(t)
RETURN t.name AS technologyName, c.name AS name, c.purl AS purl, affectedSystems
