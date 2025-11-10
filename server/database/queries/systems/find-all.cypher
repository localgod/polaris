MATCH (s:System)
OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
OPTIONAL MATCH (s)-[:USES]->(c:Component)
OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
RETURN s.name as name,
       s.domain as domain,
       team.name as ownerTeam,
       s.businessCriticality as businessCriticality,
       s.environment as environment,
       s.sourceCodeType as sourceCodeType,
       s.hasSourceAccess as hasSourceAccess,
       count(DISTINCT c) as componentCount,
       count(DISTINCT r) as repositoryCount
ORDER BY s.businessCriticality DESC, s.name
