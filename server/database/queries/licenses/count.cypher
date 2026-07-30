MATCH (l:License)
{{WHERE_CONDITIONS}}
OPTIONAL MATCH (c:Component)-[:HAS_LICENSE]->(l)
OPTIONAL MATCH (:System)-[u:USES]->(c)
WITH l, c, coalesce(max(CASE WHEN u.isDirect = true THEN 1 ELSE 0 END), 0) = 1 as componentIsDirect
WHERE c IS NULL OR $directOnly = false OR componentIsDirect
WITH l, count(c) as componentCount
WHERE $directOnly = false OR componentCount > 0
RETURN count(l) as total
