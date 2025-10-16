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
