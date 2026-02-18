MATCH (s:System {name: $name})
OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
OPTIONAL MATCH (s)-[:USES]->(c:Component)
OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
WITH s, team.name as ownerTeam, count(DISTINCT c) as componentCount, count(DISTINCT r) as repositoryCount, max(r.lastSbomScanAt) as lastSbomScanAt
RETURN s {
  .*,
  ownerTeam: ownerTeam,
  componentCount: componentCount,
  repositoryCount: repositoryCount,
  lastSbomScanAt: lastSbomScanAt
} as system
