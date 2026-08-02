CREATE (p:Platform {
  name: $name,
  type: $type,
  domain: $domain,
  vendor: $vendor
})
WITH p
OPTIONAL MATCH (team:Team {name: $stewardTeam})
FOREACH (_ IN CASE WHEN team IS NOT NULL THEN [1] ELSE [] END |
  CREATE (team)-[:STEWARDED_BY]->(p)
)
RETURN p.name as name
