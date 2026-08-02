MATCH (p:Platform {name: $name})

// Update properties
SET p.type = $type,
    p.domain = $domain,
    p.vendor = $vendor

// Update stewardship
WITH p
OPTIONAL MATCH (p)<-[oldSteward:STEWARDED_BY]-(oldTeam:Team)
DELETE oldSteward

WITH p
OPTIONAL MATCH (newTeam:Team {name: $stewardTeam})
FOREACH (_ IN CASE WHEN newTeam IS NOT NULL THEN [1] ELSE [] END |
  MERGE (newTeam)-[:STEWARDED_BY]->(p)
)

RETURN p.name as name
