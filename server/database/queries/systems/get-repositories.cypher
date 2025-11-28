// Get all repositories for a system
MATCH (s:System {name: $systemName})-[:HAS_SOURCE_IN]->(r:Repository)
RETURN r.url as url,
       r.name as name,
       r.createdAt as createdAt,
       r.updatedAt as updatedAt,
       r.lastSbomScanAt as lastSbomScanAt
ORDER BY r.name
