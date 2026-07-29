// Link all components matching the same package identity — (name, group, packageManager) —
// to a technology. Matching includes group/packageManager, not just name: unrelated packages
// routinely share a bare name across npm scopes or ecosystems (e.g. @nuxt/ui vs @vitest/ui),
// and matching on name alone would silently cross-link them into the same Technology.
// Returns the technology name, component name, count of linked components, and affected systems.

MATCH (t:Technology {name: $technologyName})
MATCH (c:Component {name: $componentName})
WHERE NOT (c)-[:IS_VERSION_OF]->(t)
  AND coalesce(c.`group`, '') = coalesce($componentGroup, '')
  AND coalesce(c.packageManager, '') = coalesce($componentPackageManager, '')
WITH t, collect(c) AS components
UNWIND components AS c
CREATE (c)-[:IS_VERSION_OF]->(t)
WITH t, components
UNWIND components AS c2
OPTIONAL MATCH (s:System)-[:USES]->(c2)
WITH t, components, collect(DISTINCT s.name) AS affectedSystemsRaw
WITH t, components, [x IN affectedSystemsRaw WHERE x IS NOT NULL] AS affectedSystems

CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'LINK',
  entityType: 'TechnologyComponent',
  entityId: t.name,
  entityLabel: $componentName + ' -> ' + t.name,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (al)-[:AUDITS]->(t)

RETURN
  t.name AS technologyName,
  $componentName AS name,
  size(components) AS count,
  affectedSystems
LIMIT 1
