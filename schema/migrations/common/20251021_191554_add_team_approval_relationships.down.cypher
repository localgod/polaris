/*
 * Rollback Migration: Add Team Approval Relationships
 * Version: 20251021.191554
 * 
 * This script rolls back the changes made in 20251021_191554_add_team_approval_relationships.up.cypher
 * 
 * WARNING: This rollback will:
 * 1. Restore Technology.status property from APPROVES relationships
 * 2. Delete all APPROVES relationships
 * 3. Remove APPROVES relationship indexes
 * 
 * Note: If multiple teams have different approval statuses for the same technology,
 * only one status will be preserved (the first one found).
 */

// ============================================================================
// STEP 1: Recreate Technology.status index
// ============================================================================

CREATE INDEX technology_status IF NOT EXISTS
FOR (t:Technology)
ON (t.status);

// ============================================================================
// STEP 2: Restore Technology.status from APPROVES relationships
// ============================================================================

// For each Technology, restore status from any team's approval
// Note: If multiple teams have different statuses, this takes the first one
MATCH (team:Team)-[a:APPROVES]->(tech:Technology)
WITH tech, collect(a.status)[0] as status
SET tech.status = status;

// ============================================================================
// STEP 3: Delete all APPROVES relationships
// ============================================================================

// Remove all team-to-technology approvals
MATCH (team:Team)-[a:APPROVES]->(tech:Technology)
DELETE a;

// Remove all team-to-version approvals
MATCH (team:Team)-[a:APPROVES]->(v:Version)
DELETE a;

// ============================================================================
// STEP 4: Drop APPROVES relationship indexes
// ============================================================================

DROP INDEX approves_status IF EXISTS;
DROP INDEX approves_eol_date IF EXISTS;
DROP INDEX approves_approved_at IF EXISTS
