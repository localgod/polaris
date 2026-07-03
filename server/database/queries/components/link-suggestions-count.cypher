MATCH (c:Component)<-[uses:USES {isDirect: true}]-(:System)
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
  AND c.linkDismissedAt IS NULL
  AND c.purl IS NOT NULL
  AND ($search IS NULL OR toLower(c.name) CONTAINS toLower($search))
RETURN count(DISTINCT c.name) AS total
