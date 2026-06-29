MATCH (a:AuditLog)
RETURN DISTINCT a.operation AS operation
ORDER BY operation
