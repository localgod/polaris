/*
 * Rollback Migration: Add Team USES Technology Relationship
 * Version: 2025.10.22.140437
 * 
 * This script rolls back the changes made in 20251022_140437_add_team_uses_technology_relationship.up.cypher
 */

// Drop indexes
DROP INDEX team_uses_technology_first_used IF EXISTS;
DROP INDEX team_uses_technology_last_verified IF EXISTS;

// Remove all USES relationships between Team and Technology
MATCH (team:Team)-[u:USES]->(tech:Technology)
DELETE u;
