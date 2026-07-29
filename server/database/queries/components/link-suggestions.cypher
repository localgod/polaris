// Returns unlinked, non-dismissed, direct-dependency components with fuzzy Technology name suggestions.
// Deduplicates by (name, group, packageManager) — bare name alone is not a safe dedup key,
// since unrelated packages routinely share a name across npm scopes or ecosystems
// (e.g. @nuxt/ui vs @vitest/ui, or a DefinitelyTyped @types/* package vs the real package).
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
// Results ordered: exact matches first, then alphabetically by component name and group.
// Total count is fetched separately via link-suggestions-count.cypher to avoid
// collecting all matching nodes into memory before paginating.
MATCH (c:Component)<-[uses:USES {isDirect: true}]-(:System)
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
  AND c.linkDismissedAt IS NULL
  AND c.purl IS NOT NULL
  AND ($search IS NULL OR toLower(c.name) CONTAINS toLower($search))
WITH c.name AS componentName, c.`group` AS componentGroup, c.packageManager AS packageManager, c.description AS description, c.purl AS purl,
     toLower(split(last(split(c.purl, '/')), '@')[0]) AS purlName
WHERE size(purlName) > 0
// Different versions of the same component may carry different (or missing) description/purl — take the first non-null one
WITH componentName, componentGroup, packageManager, purlName,
     [d IN collect(description) WHERE d IS NOT NULL][0] AS description,
     [p IN collect(purl) WHERE p IS NOT NULL][0] AS purl
OPTIONAL MATCH (t:Technology)
  WHERE toLower(t.name) = purlName AND t IS NOT NULL
WITH componentName, componentGroup, packageManager, purlName, description, purl, [x IN collect(t.name) WHERE x IS NOT NULL] AS exactMatches
OPTIONAL MATCH (t2:Technology)
  WHERE toLower(t2.name) CONTAINS purlName AND NOT toLower(t2.name) = purlName AND t2 IS NOT NULL
WITH componentName, componentGroup, packageManager, purlName, description, purl, exactMatches,
     [x IN collect(t2.name) WHERE x IS NOT NULL][0..4] AS partialMatches
WITH componentName, componentGroup, packageManager, purlName, description, purl,
     exactMatches + partialMatches AS suggestedTechnologies,
     size(exactMatches) > 0 AS hasExactMatch
ORDER BY hasExactMatch DESC, componentName ASC, componentGroup ASC
SKIP toInteger($skip) LIMIT toInteger($limit)
RETURN
  componentName AS name,
  componentGroup AS `group`,
  packageManager,
  purl,
  purlName,
  description,
  suggestedTechnologies,
  hasExactMatch
