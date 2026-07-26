MATCH (c:Component)
WHERE c.linkDismissedAt IS NOT NULL
  AND ($search IS NULL OR toLower(c.name) CONTAINS toLower($search))
RETURN count(DISTINCT c.name) AS total
