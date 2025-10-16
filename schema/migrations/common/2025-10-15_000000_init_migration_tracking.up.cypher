/*
 * Migration: Initialize Migration Tracking System
 * Version: 2025.10.15.000000
 * Author: @system
 * Ticket: INFRA-001
 * 
 * Description:
 * Sets up the migration tracking infrastructure by creating constraints
 * and indexes for the Migration node label. This is the foundational
 * migration that enables all future schema evolution tracking.
 *
 * Dependencies:
 * - None (this is the first migration)
 *
 * Rollback: See 2025-10-15_000000_init_migration_tracking.down.cypher
 */

// Create unique constraint on migration filename
CREATE CONSTRAINT migration_filename_unique IF NOT EXISTS
FOR (m:Migration)
REQUIRE m.filename IS UNIQUE;

// Create unique constraint on migration version
CREATE CONSTRAINT migration_version_unique IF NOT EXISTS
FOR (m:Migration)
REQUIRE m.version IS UNIQUE;

// Create index on appliedAt for chronological queries
CREATE INDEX migration_applied_at IF NOT EXISTS
FOR (m:Migration)
ON (m.appliedAt);

// Create index on status for filtering
CREATE INDEX migration_status IF NOT EXISTS
FOR (m:Migration)
ON (m.status);
