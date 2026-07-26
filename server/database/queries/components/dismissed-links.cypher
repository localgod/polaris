// Returns components previously dismissed from the link-suggestions queue.
// Deduplicates by component name (ignoring version), since dismissal applies to
// all versions of a component at once — see components/dismiss-link.cypher.
// Ordered most-recently-dismissed first.
MATCH (c:Component)
WHERE c.linkDismissedAt IS NOT NULL
  AND ($search IS NULL OR toLower(c.name) CONTAINS toLower($search))
WITH c.name AS componentName, c.packageManager AS packageManager, c.description AS description, c.purl AS purl, c.linkDismissedAt AS linkDismissedAt
WITH componentName, packageManager,
     [d IN collect(description) WHERE d IS NOT NULL][0] AS description,
     [p IN collect(purl) WHERE p IS NOT NULL][0] AS purl,
     max(linkDismissedAt) AS dismissedAt
ORDER BY dismissedAt DESC, componentName ASC
SKIP toInteger($skip) LIMIT toInteger($limit)
RETURN
  componentName AS name,
  packageManager,
  description,
  purl,
  toString(dismissedAt) AS dismissedAt
