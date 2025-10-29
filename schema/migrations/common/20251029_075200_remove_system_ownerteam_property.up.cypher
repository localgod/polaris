/*
 * Migration: Remove System ownerTeam Property
 * Version: 2025.10.29.075200
 * 
 * Description:
 * Removes the ownerTeam property from System nodes and its associated index.
 * The OWNS relationship between Team and System is now the single source of truth
 * for system ownership.
 *
 * Changes:
 * - Drops the system_owner_team index
 * - Removes the ownerTeam property from all System nodes
 *
 * Dependencies:
 * - 2025-10-16_100000_create_tech_catalog_schema.up.cypher
 *
 * Rollback: See 20251029_075200_remove_system_ownerteam_property.down.cypher
 */

// Drop the index on ownerTeam
DROP INDEX system_owner_team IF EXISTS;

// Remove ownerTeam property from all System nodes
MATCH (s:System)
WHERE s.ownerTeam IS NOT NULL
REMOVE s.ownerTeam;
