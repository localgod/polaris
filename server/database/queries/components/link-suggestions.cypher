// Returns unlinked, non-dismissed components with fuzzy Technology name suggestions.
//
// PURL name extraction: last path segment before the first '@'
//   pkg:npm/react@18.2.0           → react
//   pkg:npm/%40scope/react-dom@18  → react-dom
//   pkg:maven/org.spring/core@5    → core
//
// Suggestions:
//   exactMatches   — Technology names whose toLower equals the extracted purlName
//   partialMatches — Technology names that contain the purlName (up to 4)
//
// Results ordered: exact matches first, then alphabetically by component name.
// Total count is fetched separately via link-suggestions-count.cypher to avoid
// collecting all matching nodes into memory before paginating.
MATCH (c:Component)
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
  AND c.linkDismissedAt IS NULL
  AND c.purl IS NOT NULL
WITH c, toLower(split(last(split(c.purl, '/')), '@')[0]) AS purlName
WHERE size(purlName) > 0
OPTIONAL MATCH (t:Technology)
  WHERE toLower(t.name) = purlName AND t IS NOT NULL
WITH c, purlName, [x IN collect(t.name) WHERE x IS NOT NULL] AS exactMatches
OPTIONAL MATCH (t2:Technology)
  WHERE toLower(t2.name) CONTAINS purlName AND NOT toLower(t2.name) = purlName AND t2 IS NOT NULL
WITH c, purlName, exactMatches,
     [x IN collect(t2.name) WHERE x IS NOT NULL][0..4] AS partialMatches
WITH c, purlName,
     exactMatches + partialMatches AS suggestedTechnologies,
     size(exactMatches) > 0 AS hasExactMatch
ORDER BY hasExactMatch DESC, c.name ASC
SKIP $skip LIMIT $limit
RETURN
  c.purl           AS purl,
  c.name           AS name,
  c.version        AS version,
  c.packageManager AS packageManager,
  purlName,
  suggestedTechnologies,
  hasExactMatch
