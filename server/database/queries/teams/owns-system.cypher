MATCH (s:System {name: $resourceName})
MATCH (t:Team)-[:OWNS]->(s)
WHERE t.name IN $teamNames
RETURN count(s) > 0 as hasAccess
