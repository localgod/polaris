MATCH (c:Component)<-[uses:USES {isDirect: true}]-(:System)
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
  AND c.linkDismissedAt IS NULL
  AND c.purl IS NOT NULL
RETURN count(DISTINCT c.name) AS total
