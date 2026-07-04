MATCH (c:Component)<-[uses:USES {isDirect: true}]-(:System)
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
  AND c.linkDismissedAt IS NULL
  AND c.purl IS NOT NULL
  AND ($search IS NULL OR toLower(c.name) CONTAINS toLower($search))
WITH c, toLower(split(last(split(c.purl, '/')), '@')[0]) AS purlName
WHERE size(purlName) > 0
RETURN count(DISTINCT c.name) AS total
