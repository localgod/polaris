// Register a repository for a system
MATCH (s:System {name: $systemName})
MERGE (r:Repository {url: $url})
ON CREATE SET
  r.name = $name,
  r.createdAt = datetime(),
  r.updatedAt = datetime(),
  r.lastSbomScanAt = null
ON MATCH SET
  r.updatedAt = datetime()
MERGE (s)-[rel:HAS_SOURCE_IN]->(r)
ON CREATE SET rel.addedAt = datetime()
WITH s, r, {
  operation: 'ADD_REPOSITORY',
  entityType: 'System',
  entityId: s.name,
  entityLabel: s.name + ' <- ' + r.url,
  changedFields: ['repositories'],
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(s)
RETURN r.url as url,
       r.name as name,
       r.createdAt as createdAt,
       r.updatedAt as updatedAt,
       r.lastSbomScanAt as lastSbomScanAt
