MATCH (c:Component {name: $componentName})
REMOVE c.linkDismissedAt
RETURN count(c) AS restored
