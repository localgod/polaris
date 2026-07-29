MATCH (s:System {name: $systemName})
WITH s, {
  operation: 'IMPORT_SBOM',
  entityType: 'System',
  entityId: s.name,
  entityLabel: s.name,
  changedFields: ['components'],
  source: 'API',
  userId: $userId,
  realUserId: $realUserId,
  metadata: $metadata,
  correlationId: $correlationId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(s)
