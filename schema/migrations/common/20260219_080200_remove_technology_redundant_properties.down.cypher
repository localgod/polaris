/*
 * Rollback Migration: Remove Redundant Technology Node Properties
 * Version: 2026.02.19.080200
 *
 * Description:
 * Restores ownerTeam property from OWNS relationships.
 * approvedVersionRange and riskLevel cannot be restored as the data is lost.
 */

// Restore ownerTeam property from OWNS relationships
MATCH (team:Team)-[:OWNS]->(t:Technology)
SET t.ownerTeam = team.name;
