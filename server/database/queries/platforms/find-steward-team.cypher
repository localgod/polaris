MATCH (p:Platform {name: $name})
OPTIONAL MATCH (team:Team)-[:STEWARDED_BY]->(p)
RETURN p.name as name, team.name as stewardTeam
