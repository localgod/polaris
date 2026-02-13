MATCH (t:Technology {name: $name})
OPTIONAL MATCH (team:Team)-[:OWNS]->(t)
RETURN t.name as name, team.name as ownerTeam
