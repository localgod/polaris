MATCH (t:Team)
OPTIONAL MATCH (t)-[:STEWARDED_BY]->(tech:Technology)
OPTIONAL MATCH (t)-[:OWNS]->(sys:System)
OPTIONAL MATCH (u:User)-[:MEMBER_OF]->(t)
RETURN t.name as name,
       t.email as email,
       t.responsibilityArea as responsibilityArea,
       count(DISTINCT tech) as technologyCount,
       count(DISTINCT sys) as systemCount,
       count(DISTINCT u) as memberCount
ORDER BY t.name
