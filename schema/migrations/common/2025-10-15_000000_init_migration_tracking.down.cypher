/*
 * Rollback Migration: Initialize Migration Tracking System
 * Version: 2025.10.15.000000
 * 
 * This script rolls back the changes made in 2025-10-15_000000_init_migration_tracking.up.cypher
 * 
 * WARNING: This will remove all migration tracking infrastructure.
 * Only use this in development or if you need to completely reset the migration system.
 */

// Drop indexes
DROP INDEX migration_status IF EXISTS;
DROP INDEX migration_applied_at IF EXISTS;

// Drop constraints
DROP CONSTRAINT migration_version_unique IF EXISTS;
DROP CONSTRAINT migration_filename_unique IF EXISTS;

// Optionally remove all Migration nodes (commented out for safety)
// MATCH (m:Migration) DELETE m;
