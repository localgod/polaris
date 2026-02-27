// Find teams using technologies without approval or with eliminate status
MATCH (team:Team)-[u:USES]->(tech:Technology)
OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
WHERE a IS NULL OR a.time = 'eliminate'
WITH team, tech, u, a,
     [(team)-[:OWNS]->(sys:System)-[:USES]->(:Component)-[:IS_VERSION_OF]->(tech) | sys.name] as systems
RETURN 
  team.name as team,
  tech.name as technology,
  tech.type as type,
  u.systemCount as systemCount,
  systems,
  CASE 
    WHEN a IS NULL THEN 'unapproved'
    WHEN a.time = 'eliminate' THEN 'eliminated'
    ELSE 'unknown'
  END as violationType,
  a.notes as notes,
  a.migrationTarget as migrationTarget
ORDER BY u.systemCount DESC, team.name, tech.name
