// One AuditLog entry per newly-added component, so "who introduced component
// X into system Y" can be answered directly. Deliberately does NOT audit
// components that were merely re-seen/updated on a re-scan — that would
// create one AuditLog node per component on every periodic import for an
// already-tracked system, with no compliance benefit since nothing changed.
MATCH (s:System {name: $systemName})
UNWIND $components AS comp
OPTIONAL MATCH (c:Component {purl: comp.purl})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'ADD_COMPONENT',
  entityType: 'Component',
  entityId: coalesce(comp.purl, comp.name + '@' + coalesce(comp.version, 'unknown')),
  entityLabel: comp.name + '@' + coalesce(comp.version, 'unknown'),
  newStatus: $systemName,
  changedFields: ['system'],
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(s)
FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
  CREATE (a)-[:AUDITS]->(c)
)
