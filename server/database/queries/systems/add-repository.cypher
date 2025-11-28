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
RETURN r.url as url,
       r.name as name,
       r.createdAt as createdAt,
       r.updatedAt as updatedAt,
       r.lastSbomScanAt as lastSbomScanAt
