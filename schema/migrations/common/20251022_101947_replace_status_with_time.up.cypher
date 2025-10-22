/*
 * Migration: Replace Status with TIME Framework
 * Version: 20251022.101947
 * Author: @system
 * Ticket: CATALOG-003
 * 
 * Description:
 * Replaces the 'status' field with 'time' field using Gartner's TIME framework:
 * - Tolerate: Keep running but minimize investment (legacy, EOL approaching)
 * - Invest: Strategic applications worth continued investment
 * - Migrate: Move to newer platforms/technologies
 * - Eliminate: Phase out and decommission
 *
 * This migration:
 * 1. Adds constraint to ensure only valid TIME values
 * 2. Migrates existing status values to TIME categories
 * 3. Renames status property to time
 * 4. Updates indexes
 *
 * Status to TIME Mapping:
 * - approved -> invest
 * - deprecated -> migrate (or tolerate if no migrationTarget)
 * - experimental -> invest
 * - restricted -> eliminate
 *
 * Dependencies:
 * - 20251021_191554_add_team_approval_relationships.up.cypher
 *
 * Rollback: See 20251022_101947_replace_status_with_time.down.cypher
 */

// ============================================================================
// STEP 1: Map existing status values to TIME categories
// ============================================================================

// Map 'approved' -> 'invest'
MATCH ()-[a:APPROVES]->()
WHERE a.status = 'approved'
SET a.time = 'invest'
REMOVE a.status;

// Map 'deprecated' with migrationTarget -> 'migrate'
MATCH ()-[a:APPROVES]->()
WHERE a.status = 'deprecated' AND a.migrationTarget IS NOT NULL
SET a.time = 'migrate'
REMOVE a.status;

// Map 'deprecated' without migrationTarget -> 'tolerate'
MATCH ()-[a:APPROVES]->()
WHERE a.status = 'deprecated' AND a.migrationTarget IS NULL
SET a.time = 'tolerate'
REMOVE a.status;

// Map 'experimental' -> 'invest' (evaluating for future investment)
MATCH ()-[a:APPROVES]->()
WHERE a.status = 'experimental'
SET a.time = 'invest'
REMOVE a.status;

// Map 'restricted' -> 'eliminate'
MATCH ()-[a:APPROVES]->()
WHERE a.status = 'restricted'
SET a.time = 'eliminate'
REMOVE a.status;

// Handle any remaining status values (default to 'tolerate')
MATCH ()-[a:APPROVES]->()
WHERE a.status IS NOT NULL
SET a.time = 'tolerate'
REMOVE a.status;

// ============================================================================
// STEP 2: Update indexes
// ============================================================================

// Drop old status index
DROP INDEX approves_status IF EXISTS;

// Create new TIME index
CREATE INDEX approves_time IF NOT EXISTS
FOR ()-[a:APPROVES]-()
ON (a.time);

// ============================================================================
// STEP 3: Add constraint to ensure only valid TIME values
// ============================================================================
// Note: Neo4j Community Edition doesn't support property existence constraints
// on relationships, so we rely on application-level validation.
// Enterprise Edition would use:
// CREATE CONSTRAINT approves_time_values IF NOT EXISTS
// FOR ()-[a:APPROVES]-() REQUIRE a.time IN ['tolerate', 'invest', 'migrate', 'eliminate'];
