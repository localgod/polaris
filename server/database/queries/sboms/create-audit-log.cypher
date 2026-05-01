MATCH (s:System {name: $systemName})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'IMPORT_SBOM',
  entityType: 'System',
  entityId: s.name,
  entityLabel: s.name,
  changedFields: ['components'],
  source: 'API',
  userId: $userId,
  metadata: $metadata
})
CREATE (a)-[:AUDITS]->(s)
