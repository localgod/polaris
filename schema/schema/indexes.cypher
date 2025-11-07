/*
 * Database Indexes
 * 
 * Defines performance indexes for frequently queried properties.
 * These are applied via migrations, not directly.
 */

// Migration tracking indexes
CREATE INDEX migration_applied_at IF NOT EXISTS
FOR (m:Migration)
ON (m.appliedAt);

CREATE INDEX migration_status IF NOT EXISTS
FOR (m:Migration)
ON (m.status);

// Audit log indexes
CREATE INDEX audit_log_timestamp IF NOT EXISTS
FOR (a:AuditLog)
ON (a.timestamp);

CREATE INDEX audit_log_entity_type IF NOT EXISTS
FOR (a:AuditLog)
ON (a.entityType);

CREATE INDEX audit_log_entity_id IF NOT EXISTS
FOR (a:AuditLog)
ON (a.entityId);

CREATE INDEX audit_log_operation IF NOT EXISTS
FOR (a:AuditLog)
ON (a.operation);

CREATE INDEX audit_log_user_id IF NOT EXISTS
FOR (a:AuditLog)
ON (a.userId);

CREATE INDEX audit_log_source IF NOT EXISTS
FOR (a:AuditLog)
ON (a.source);

CREATE INDEX audit_log_entity_composite IF NOT EXISTS
FOR (a:AuditLog)
ON (a.entityType, a.entityId, a.timestamp);
