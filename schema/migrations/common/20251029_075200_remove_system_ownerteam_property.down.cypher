/*
 * Rollback Migration: Remove System ownerTeam Property
 * Version: 2025.10.29.075200
 * 
 * Description:
 * Restores the ownerTeam property on System nodes by copying from the OWNS relationship.
 * Recreates the index on ownerTeam.
 *
 * Changes:
 * - Recreates the system_owner_team index
 * - Restores ownerTeam property from OWNS relationships
 */

// Recreate the index on ownerTeam
CREATE INDEX system_owner_team IF NOT EXISTS
FOR (s:System)
ON (s.ownerTeam);

// Restore ownerTeam property from OWNS relationships
MATCH (team:Team)-[:OWNS]->(s:System)
SET s.ownerTeam = team.name;
