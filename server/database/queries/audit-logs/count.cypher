MATCH (a:AuditLog)
{{WHERE_CONDITIONS}}
RETURN count(a) AS count
