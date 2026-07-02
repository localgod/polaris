MATCH (team:Team {name: $teamName})-[a:APPROVES]->(p:Platform {name: $platformName})
WHERE (a.environment IS NULL AND $environment IS NULL)
   OR a.environment = $environment
RETURN a.time as time, a.notes as notes
LIMIT 1
