/*
 * Rollback Migration: Replace Status with TIME Framework
 * Version: 20251022.101947
 * 
 * This script rolls back the changes made in 20251022_101947_replace_status_with_time.up.cypher
 * 
 * Restores the original 'status' field from 'time' field.
 */

// ============================================================================
// STEP 1: Map TIME categories back to status values
// ============================================================================

// Map 'invest' -> 'approved'
MATCH ()-[a:APPROVES]->()
WHERE a.time = 'invest'
SET a.status = 'approved'
REMOVE a.time;

// Map 'migrate' -> 'deprecated'
MATCH ()-[a:APPROVES]->()
WHERE a.time = 'migrate'
SET a.status = 'deprecated'
REMOVE a.time;

// Map 'tolerate' -> 'deprecated'
MATCH ()-[a:APPROVES]->()
WHERE a.time = 'tolerate'
SET a.status = 'deprecated'
REMOVE a.time;

// Map 'eliminate' -> 'restricted'
MATCH ()-[a:APPROVES]->()
WHERE a.time = 'eliminate'
SET a.status = 'restricted'
REMOVE a.time;

// Handle any remaining time values (default to 'approved')
MATCH ()-[a:APPROVES]->()
WHERE a.time IS NOT NULL
SET a.status = 'approved'
REMOVE a.time;

// ============================================================================
// STEP 2: Update indexes
// ============================================================================

// Drop TIME index
DROP INDEX approves_time IF EXISTS;

// Recreate status index
CREATE INDEX approves_status IF NOT EXISTS
FOR ()-[a:APPROVES]-()
ON (a.status);
