MATCH (s:System)
OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
OPTIONAL MATCH (s)-[:USES]->(c:Component)
OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
WITH s, team, count(DISTINCT c) as componentCount, count(DISTINCT r) as repositoryCount
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
ORDER BY s.businessCriticality DESC, s.name ASC
SKIP toInteger($offset)
LIMIT toInteger($limit)
