MATCH (t:Team {name: $name})-[:OWNS]->(s:System)
RETURN count(s) as systemCount
