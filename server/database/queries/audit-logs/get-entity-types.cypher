MATCH (a:AuditLog)
RETURN DISTINCT a.entityType AS entityType
ORDER BY entityType
