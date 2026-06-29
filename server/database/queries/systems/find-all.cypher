MATCH (s:System)
{{WHERE_CONDITIONS}}
OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
CALL {
  WITH s
  OPTIONAL MATCH (s)-[u:USES]->(c:Component)
  WHERE u.isDirect = true
  RETURN count(DISTINCT c) as componentCount
}
OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
WITH s, team, componentCount, count(DISTINCT r) as repositoryCount
ORDER BY {{ORDER_BY}}
SKIP toInteger($offset)
LIMIT toInteger($limit)
RETURN s.name as name,
       s.domain as domain,
       team.name as ownerTeam,
       s.businessCriticality as businessCriticality,
       s.environment as environment,
       componentCount,
       repositoryCount
