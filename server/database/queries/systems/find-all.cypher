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
WITH collect({s: s, team: team, componentCount: componentCount, repositoryCount: repositoryCount}) as allRows, count(s) as total
UNWIND allRows as row
WITH row.s as s, row.team as team, row.componentCount as componentCount, row.repositoryCount as repositoryCount, total
RETURN s.name as name,
       s.domain as domain,
       team.name as ownerTeam,
       s.businessCriticality as businessCriticality,
       s.environment as environment,
       componentCount,
       repositoryCount,
       total
ORDER BY {{ORDER_BY}}
SKIP toInteger($offset)
LIMIT toInteger($limit)
