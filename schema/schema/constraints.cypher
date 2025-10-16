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
