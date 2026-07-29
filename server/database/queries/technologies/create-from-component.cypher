// Creates a Technology and links every currently-unlinked Component sharing the same
// package identity — (name, group, packageManager) — to it, atomically. Technology can
// never exist without at least one linked Component (see docs/architecture/decisions/
// 0004-technology-requires-component.md).
//
// Matching includes group/packageManager, not just name: unrelated packages routinely
// share a bare name across npm scopes or ecosystems (e.g. @nuxt/ui vs @vitest/ui, or npm
// "requests" vs PyPI "requests"), and matching on name alone would silently merge them
// into one Technology.
//
// If zero components match (none exist with this identity, or all are already linked
// elsewhere), nothing is created and zero rows are returned so the caller can reject the request.
//
MATCH (c:Component {name: $componentName})
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
  AND coalesce(c.`group`, '') = coalesce($componentGroup, '')
  AND coalesce(c.packageManager, '') = coalesce($componentPackageManager, '')
WITH collect(c) AS components
WHERE size(components) > 0
CREATE (t:Technology {
  name: $name,
  type: $type,
  domain: $domain,
  vendor: $vendor
})
WITH t, components
UNWIND components AS c
CREATE (c)-[:IS_VERSION_OF]->(t)
WITH t, count(c) AS linkedCount
OPTIONAL MATCH (team:Team {name: $ownerTeam})
FOREACH (_ IN CASE WHEN team IS NOT NULL THEN [1] ELSE [] END |
  CREATE (team)-[:STEWARDED_BY]->(t)
)
WITH t, linkedCount, {
  operation: 'CREATE',
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: ['name', 'type', 'domain', 'vendor', 'componentName'],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(t)
RETURN t.name as name, linkedCount
