// Link all components with a given name to a technology.
// Returns the technology name, component name, count of linked components, and affected systems.

MATCH (t:Technology {name: $technologyName})
MATCH (c:Component {name: $componentName})
WHERE NOT (c)-[:IS_VERSION_OF]->(t)

// Create the IS_VERSION_OF relationship
CREATE (c)-[:IS_VERSION_OF]->(t)

// Find all systems affected by this linking
WITH t, c, $componentName AS componentName, count(c) AS linkedCount
MATCH (s:System)-[uses:USES]->(c)
WITH t, componentName, linkedCount, collect(DISTINCT s.name) AS affectedSystems

CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'LINK',
  entityType: 'TechnologyComponent',
  entityId: t.name,
  entityLabel: componentName + ' -> ' + t.name,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (al)-[:AUDITS]->(t)

RETURN
  t.name AS technologyName,
  componentName AS name,
  linkedCount AS count,
  affectedSystems
LIMIT 1
