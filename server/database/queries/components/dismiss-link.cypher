// Matches by full package identity, not just name — see link-suggestions.cypher for why
// bare name isn't a safe key (e.g. @nuxt/ui vs @vitest/ui share the name "ui").
MATCH (c:Component {name: $componentName})
WHERE coalesce(c.`group`, '') = coalesce($componentGroup, '')
  AND coalesce(c.packageManager, '') = coalesce($componentPackageManager, '')
SET c.linkDismissedAt = datetime()
RETURN count(c) AS dismissed
