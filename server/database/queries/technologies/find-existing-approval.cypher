MATCH (team:Team {name: $teamName})-[a:APPROVES]->(t:Technology {name: $technologyName})
WHERE (a.environment IS NULL AND $environment IS NULL)
   OR a.environment = $environment
RETURN a.time as time, a.notes as notes
LIMIT 1
