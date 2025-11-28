MATCH (r:Repository {url: $url})
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url as url,
       r.name as name,
       r.createdAt as createdAt,
       r.updatedAt as updatedAt,
       r.lastSbomScanAt as lastSbomScanAt,
       count(DISTINCT s) as systemCount
