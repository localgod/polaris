MATCH (a:AuditLog)
{{WHERE_CONDITIONS}}
OPTIONAL MATCH (performer:User {id: a.userId})
RETURN a, performer.name AS performerName
ORDER BY {{ORDER_BY}}
SKIP $offset
LIMIT $limit
