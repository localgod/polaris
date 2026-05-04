// Rollback: Remove realUserId property from AuditLog nodes
MATCH (a:AuditLog)
WHERE a.realUserId IS NOT NULL
REMOVE a.realUserId;

// Drop the realUserId index
DROP INDEX audit_log_real_user_id IF EXISTS;
