MATCH (team:Team {name: $teamName})-[a:APPROVES]->(t:Technology {name: $technologyName})
RETURN a.time as time, a.notes as notes
