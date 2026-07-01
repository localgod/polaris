MATCH (c:Component {purl: $purl})
SET c.linkDismissedAt = datetime()
RETURN c.purl AS purl
