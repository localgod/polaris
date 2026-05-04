MATCH (tech:Technology {name: $resourceName})
MATCH (t:Team)-[:STEWARDED_BY]->(tech)
WHERE t.name IN $teamNames
RETURN count(tech) > 0 as hasAccess
