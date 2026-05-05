MATCH (s:System {name: $name})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'DELETE',
  entityType: 'System',
  entityId: s.name,
  entityLabel: s.name,
  changedFields: [],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})

// Collect components used exclusively by this system (no other USES relationship).
// These become orphans once the system is removed and must be cleaned up.
// OPTIONAL MATCH ensures the pipeline continues even when the system has no components.
WITH s
OPTIONAL MATCH (s)-[:USES]->(c:Component)
WHERE NOT EXISTS { MATCH (other:System)-[:USES]->(c) WHERE other <> s }
WITH s, collect(c) AS orphans

// Delete Hash and ExternalReference nodes owned by orphaned components.
// These node types have no meaning outside their parent component.
FOREACH (c IN orphans |
  DETACH DELETE c
)

// Remove the system and all its remaining relationships
// (USES edges to shared components, DIRECT_DEP edges, HAS_SOURCE_IN, etc.)
DETACH DELETE s
