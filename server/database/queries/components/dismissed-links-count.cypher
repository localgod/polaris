// Count must use the same dedup key as dismissed-links.cypher: (name, group, packageManager).
MATCH (c:Component)
WHERE c.linkDismissedAt IS NOT NULL
  AND ($search IS NULL OR toLower(c.name) CONTAINS toLower($search))
RETURN count(DISTINCT [c.name, coalesce(c.`group`, ''), coalesce(c.packageManager, '')]) AS total
