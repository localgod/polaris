MATCH (team:Team)-[:OWNS]->(sys:System)-[u:USES]->(comp:Component)-[:HAS_LICENSE]->(license:License)
WHERE license.allowed = false
  AND ($directOnly IS NULL OR $directOnly = false OR u.isDirect = true)
  AND ($depScope IS NULL OR u.scope = $depScope)
  {{AND_CONDITIONS}}
RETURN count(*) as total
