/*
 * Database Constraints
 * 
 * Defines uniqueness, existence, and node key constraints.
 * These are applied via migrations, not directly.
 */

// Migration tracking constraints
CREATE CONSTRAINT migration_filename_unique IF NOT EXISTS
FOR (m:Migration)
REQUIRE m.filename IS UNIQUE;

CREATE CONSTRAINT migration_version_unique IF NOT EXISTS
FOR (m:Migration)
REQUIRE m.version IS UNIQUE;

// Audit log constraints
CREATE CONSTRAINT audit_log_id_unique IF NOT EXISTS
FOR (a:AuditLog)
REQUIRE a.id IS UNIQUE;

// Import job constraints
CREATE CONSTRAINT import_job_id_unique IF NOT EXISTS
FOR (j:ImportJob)
REQUIRE j.id IS UNIQUE;

CREATE CONSTRAINT import_job_item_id_unique IF NOT EXISTS
FOR (i:ImportJobItem)
REQUIRE i.id IS UNIQUE;

// Health snapshot constraints
CREATE CONSTRAINT health_snapshot_component_purl_unique IF NOT EXISTS
FOR (h:HealthSnapshot)
REQUIRE h.componentPurl IS UNIQUE;

CREATE CONSTRAINT advisory_id_unique IF NOT EXISTS
FOR (a:Advisory)
REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT health_refresh_job_id_unique IF NOT EXISTS
FOR (j:HealthRefreshJob)
REQUIRE j.id IS UNIQUE;

CREATE CONSTRAINT health_refresh_job_item_id_unique IF NOT EXISTS
FOR (i:HealthRefreshJobItem)
REQUIRE i.id IS UNIQUE;

// License constraints
CREATE CONSTRAINT license_id_unique IF NOT EXISTS
FOR (l:License)
REQUIRE l.id IS UNIQUE;
