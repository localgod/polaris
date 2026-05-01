// Migration: Add realUserId property to AuditLog nodes
//
// When a superuser impersonates another user and performs a write operation,
// the audit log entry now records both the impersonated user's ID (userId)
// and the real operator's ID (realUserId).  For entries created outside an
// impersonation session realUserId remains null.

// Step 1: Ensure all existing AuditLog nodes that lack the property
//         have an explicit null value so queries are consistent.
MATCH (a:AuditLog)
WHERE a.realUserId IS NULL
SET a.realUserId = null;

// Step 2: Create an index on realUserId to enable efficient lookups
//         when investigating which superuser performed impersonated writes.
CREATE INDEX audit_log_real_user_id IF NOT EXISTS
FOR (a:AuditLog)
ON (a.realUserId);
