/*
 * Migration: Add Team Approval Relationships
 * Version: 20251021.191554
 * Author: @system
 * Ticket: CATALOG-002
 * 
 * Description:
 * Adds support for team-specific and version-specific technology approval policies.
 * This migration:
 * 1. Creates indexes for APPROVES relationship properties
 * 2. Migrates existing Technology.status to team-level APPROVES relationships
 * 3. Removes the global status property from Technology nodes
 * 4. Preserves OWNS relationships for governance tracking
 *
 * New Relationship: (Team)-[:APPROVES]->(Technology|Version)
 * Properties: status, approvedAt, deprecatedAt, eolDate, migrationTarget, 
 *             notes, approvedBy, versionConstraint
 *
 * Dependencies:
 * - 2025-10-16_100000_create_tech_catalog_schema.up.cypher
 *
 * Rollback: See 20251021_191554_add_team_approval_relationships.down.cypher
 */

// ============================================================================
// STEP 1: Create indexes for APPROVES relationship properties
// ============================================================================

// Index on APPROVES relationship status for filtering
CREATE INDEX approves_status IF NOT EXISTS
FOR ()-[a:APPROVES]-()
ON (a.status);

// Index on APPROVES relationship eolDate for EOL tracking
CREATE INDEX approves_eol_date IF NOT EXISTS
FOR ()-[a:APPROVES]-()
ON (a.eolDate);

// Index on APPROVES relationship approvedAt for temporal queries
CREATE INDEX approves_approved_at IF NOT EXISTS
FOR ()-[a:APPROVES]-()
ON (a.approvedAt);

// ============================================================================
// STEP 2: Migrate existing Technology.status to APPROVES relationships
// ============================================================================

// For each Technology with a status, create APPROVES relationships from teams that own it
MATCH (team:Team)-[:OWNS]->(tech:Technology)
WHERE tech.status IS NOT NULL
MERGE (team)-[:APPROVES {
  status: tech.status,
  approvedAt: datetime(),
  approvedBy: 'system-migration',
  notes: 'Migrated from global Technology.status property'
}]->(tech);

// ============================================================================
// STEP 3: Remove global status property from Technology nodes
// ============================================================================

// Remove status property as it's now managed via APPROVES relationships
MATCH (tech:Technology)
WHERE tech.status IS NOT NULL
REMOVE tech.status;

// ============================================================================
// STEP 4: Remove status index from Technology nodes (if exists)
// ============================================================================

// Drop the old technology_status index as status is now on relationships
DROP INDEX technology_status IF EXISTS
