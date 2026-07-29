// Returns components previously dismissed from the link-suggestions queue.
// Deduplicates by (name, group, packageManager) — ignoring version, since dismissal
// applies to all versions of a package at once — see components/dismiss-link.cypher.
// Ordered most-recently-dismissed first.
MATCH (c:Component)
WHERE c.linkDismissedAt IS NOT NULL
  AND ($search IS NULL OR toLower(c.name) CONTAINS toLower($search))
WITH c.name AS componentName, c.`group` AS componentGroup, c.packageManager AS packageManager, c.description AS description, c.purl AS purl, c.linkDismissedAt AS linkDismissedAt
WITH componentName, componentGroup, packageManager,
     [d IN collect(description) WHERE d IS NOT NULL][0] AS description,
     [p IN collect(purl) WHERE p IS NOT NULL][0] AS purl,
     max(linkDismissedAt) AS dismissedAt
ORDER BY dismissedAt DESC, componentName ASC, componentGroup ASC
SKIP toInteger($skip) LIMIT toInteger($limit)
RETURN
  componentName AS name,
  componentGroup AS `group`,
  packageManager,
  description,
  purl,
  toString(dismissedAt) AS dismissedAt
