MATCH (s:System)-[:HAS_SOURCE_IN]->(r:Repository {url: $url})
RETURN s.name as name
LIMIT 1
