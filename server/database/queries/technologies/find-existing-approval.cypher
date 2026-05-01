MATCH (team:Team {name: $teamName})-[a:APPROVES]->(t:Technology {name: $technologyName})
ORDER BY coalesce(a.approvedAt, a.timestamp) DESC, elementId(a) ASC
LIMIT 1
RETURN a.time as time, a.notes as notes
