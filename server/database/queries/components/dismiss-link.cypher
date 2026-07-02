MATCH (c:Component {name: $componentName})
SET c.linkDismissedAt = datetime()
RETURN count(c) AS dismissed
