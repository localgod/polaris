// Create repository and link to system
MATCH (s:System {name: $systemName})
CREATE (r:Repository {
  url: $url,
  name: $name,
  createdAt: datetime(),
  updatedAt: datetime(),
  lastSbomScanAt: null
})
CREATE (s)-[:HAS_SOURCE_IN {addedAt: datetime()}]->(r)
RETURN r.url as url,
       r.name as name,
       r.createdAt as createdAt,
       r.updatedAt as updatedAt,
       r.lastSbomScanAt as lastSbomScanAt
