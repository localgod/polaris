// $directOnly (boolean) — when true, only components with at least one
// direct System-USES edge (u.isDirect = true) count toward componentCount,
// and licenses left with zero such components are excluded entirely.
MATCH (l:License)
{{WHERE_CONDITIONS}}
OPTIONAL MATCH (c:Component)-[:HAS_LICENSE]->(l)
OPTIONAL MATCH (:System)-[u:USES]->(c)
WITH l, c, coalesce(max(CASE WHEN u.isDirect = true THEN 1 ELSE 0 END), 0) = 1 as componentIsDirect
WHERE c IS NULL OR $directOnly = false OR componentIsDirect
WITH l, count(c) as componentCount
WHERE $directOnly = false OR componentCount > 0
RETURN
  l.id as id,
  l.name as name,
  l.spdxId as spdxId,
  l.osiApproved as osiApproved,
  l.url as url,
  l.category as category,
  l.text as text,
  l.deprecated as deprecated,
  l.allowed as allowed,
  l.createdAt as createdAt,
  l.updatedAt as updatedAt,
  componentCount
ORDER BY {{ORDER_BY}}
{{PAGINATION}}
