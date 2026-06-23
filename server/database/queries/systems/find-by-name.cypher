MATCH (s:System {name: $name})
OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
CALL {
  WITH s
  OPTIONAL MATCH (s)-[u:USES]->(c:Component)
  WHERE u.isDirect = true
  RETURN count(DISTINCT c) as componentCount
}
OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
WITH s, team.name as ownerTeam, componentCount, count(DISTINCT r) as repositoryCount, max(r.lastSbomScanAt) as lastSbomScanAt
RETURN s {
  .*,
  ownerTeam: ownerTeam,
  componentCount: componentCount,
  repositoryCount: repositoryCount,
  lastSbomScanAt: lastSbomScanAt
} as system
